const express = require('express');
const { protect } = require('../middleware/auth');
const Interview = require('../models/Interview');
const User = require('../models/User');

const router = express.Router();

// Helper: Call Anthropic API
// Helper: Call Groq API (free tier)
async function callClaude(messages, systemPrompt) {
  const fetch = (await import('node-fetch')).default;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
// POST /api/interviews/start — Start a new interview
router.post('/start', protect, async (req, res) => {
  try {
    const { domain, difficulty, totalQuestions = 5, cameraEnabled = false } = req.body;

    if (!domain || !difficulty) {
      return res.status(400).json({ success: false, message: 'Domain and difficulty are required' });
    }

    // Generate first question from Claude
    const systemPrompt = `You are a senior technical interviewer specializing in ${domain}. 
Generate unique, dynamic interview questions. Never repeat generic questions.
Always respond with ONLY a JSON object in this exact format:
{"question": "Your question here", "hint": "Optional subtle hint", "expectedTopics": ["topic1", "topic2"]}
No markdown, no explanation, just the JSON.`;

    const previousQuestions = []; // No previous questions yet
    const userMsg = `Generate a ${difficulty} level interview question for ${domain}. 
This is question 1 of ${totalQuestions}. 
Previously asked: ${JSON.stringify(previousQuestions)}
Make it unique, challenging, and thought-provoking. Vary the question type (conceptual, practical, problem-solving, scenario-based).`;

    const claudeResponse = await callClaude(
      [{ role: 'user', content: userMsg }],
      systemPrompt
    );

    let questionData;
    try {
      questionData = JSON.parse(claudeResponse);
    } catch {
      questionData = { question: claudeResponse, hint: '', expectedTopics: [] };
    }

    const interview = await Interview.create({
      user: req.user._id,
      domain,
      difficulty,
      totalQuestions,
      cameraEnabled,
      questions: [{
        question: questionData.question,
        userAnswer: '',
        feedback: '',
        score: 0
      }],
      currentQuestion: 0,
      status: 'in-progress'
    });

    res.status(201).json({
      success: true,
      interview: {
        id: interview._id,
        domain,
        difficulty,
        totalQuestions,
        cameraEnabled,
        currentQuestion: 0,
        question: questionData.question,
        hint: questionData.hint,
        questionNumber: 1
      }
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ success: false, message: 'Failed to start interview: ' + error.message });
  }
});

// POST /api/interviews/:id/answer — Submit answer and get next question
router.post('/:id/answer', protect, async (req, res) => {
  try {
    const { answer, timeSpent = 0 } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (interview.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Interview is already completed' });
    }

    const currentIdx = interview.currentQuestion;
    const currentQ = interview.questions[currentIdx];

    // Get feedback from Claude
    const feedbackPrompt = `You are a strict but fair technical interviewer for ${interview.domain} at ${interview.difficulty} level.
Evaluate the candidate's answer and respond ONLY with JSON:
{"score": <0-10>, "feedback": "detailed feedback", "correctAnswer": "brief correct answer summary", "strengths": ["s1"], "improvements": ["i1"]}
No markdown, just JSON.`;

    const feedbackMsg = `Question: ${currentQ.question}
Candidate's Answer: ${answer || '[No answer provided - skipped]'}
Domain: ${interview.domain}, Difficulty: ${interview.difficulty}
Evaluate thoroughly. Score 0 if skipped or completely wrong, 10 if perfect.`;

    const feedbackResponse = await callClaude(
      [{ role: 'user', content: feedbackMsg }],
      feedbackPrompt
    );

    let feedbackData;
    try {
      feedbackData = JSON.parse(feedbackResponse);
    } catch {
      feedbackData = { score: 5, feedback: feedbackResponse, correctAnswer: '', strengths: [], improvements: [] };
    }

    // Update current question
    interview.questions[currentIdx].userAnswer = answer || '';
    interview.questions[currentIdx].feedback = feedbackData.feedback;
    interview.questions[currentIdx].score = feedbackData.score;
    interview.questions[currentIdx].timeSpent = timeSpent;
    interview.questions[currentIdx].skipped = !answer;

    const isLastQuestion = currentIdx + 1 >= interview.totalQuestions;

    if (isLastQuestion) {
      // Generate overall feedback
      const summaryPrompt = `You are a senior technical interviewer. Provide a comprehensive interview summary.
Respond ONLY with JSON: {"overallFeedback": "detailed summary", "strengths": ["s1"], "areasToImprove": ["a1"], "recommendedResources": ["r1"]}`;

      const questionsLog = interview.questions.map((q, i) => 
        `Q${i+1}: ${q.question}\nAnswer: ${q.userAnswer}\nScore: ${q.score}/10`
      ).join('\n\n');

      const summaryResponse = await callClaude(
        [{ role: 'user', content: `Summarize this ${interview.domain} ${interview.difficulty} interview:\n\n${questionsLog}` }],
        summaryPrompt
      );

      let summaryData;
      try {
        summaryData = JSON.parse(summaryResponse);
      } catch {
        summaryData = { overallFeedback: summaryResponse, strengths: [], areasToImprove: [], recommendedResources: [] };
      }

      interview.overallFeedback = summaryData.overallFeedback;
      interview.status = 'completed';
      interview.duration = interview.questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
      await interview.save();

      // Update user stats
      const allInterviews = await Interview.find({ user: req.user._id, status: 'completed' });
      const avgScore = allInterviews.reduce((sum, i) => sum + i.overallScore, 0) / allInterviews.length;
      const bestScore = Math.max(...allInterviews.map(i => i.overallScore));

      await User.findByIdAndUpdate(req.user._id, {
        'stats.totalInterviews': allInterviews.length,
        'stats.averageScore': Math.round(avgScore),
        'stats.bestScore': bestScore,
        'stats.totalQuestions': allInterviews.reduce((sum, i) => sum + i.questions.length, 0)
      });

      return res.json({
        success: true,
        completed: true,
        feedback: feedbackData,
        interview: {
          id: interview._id,
          overallScore: interview.overallScore,
          overallFeedback: summaryData.overallFeedback,
          strengths: summaryData.strengths,
          areasToImprove: summaryData.areasToImprove,
          recommendedResources: summaryData.recommendedResources,
          questions: interview.questions,
          duration: interview.duration
        }
      });
    }

    // Generate next question
    const previousQs = interview.questions.map(q => q.question);
    const systemPrompt = `You are a senior technical interviewer specializing in ${interview.domain}.
Generate unique interview questions. Never repeat topics already covered.
Respond ONLY with JSON: {"question": "question text", "hint": "subtle hint", "expectedTopics": ["t1"]}`;

    const nextQMsg = `Generate question ${currentIdx + 2} of ${interview.totalQuestions} for ${interview.domain} at ${interview.difficulty} level.
Previously asked questions: ${JSON.stringify(previousQs)}
Make this question different in type and topic. Vary between: conceptual, coding, debugging, system design, scenario-based.`;

    const nextQResponse = await callClaude(
      [{ role: 'user', content: nextQMsg }],
      systemPrompt
    );

    let nextQData;
    try {
      nextQData = JSON.parse(nextQResponse);
    } catch {
      nextQData = { question: nextQResponse, hint: '', expectedTopics: [] };
    }

    interview.questions.push({
      question: nextQData.question,
      userAnswer: '',
      feedback: '',
      score: 0
    });
    interview.currentQuestion = currentIdx + 1;
    await interview.save();

    res.json({
      success: true,
      completed: false,
      feedback: feedbackData,
      nextQuestion: {
        question: nextQData.question,
        hint: nextQData.hint,
        questionNumber: currentIdx + 2,
        totalQuestions: interview.totalQuestions
      }
    });
  } catch (error) {
    console.error('Answer error:', error);
    res.status(500).json({ success: false, message: 'Failed to process answer: ' + error.message });
  }
});

// GET /api/interviews — Get user's interviews
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const interviews = await Interview.find({ user: req.user._id })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-questions.feedback'); // Exclude detailed feedback from list

    const total = await Interview.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      interviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch interviews' });
  }
});

// GET /api/interviews/:id — Get interview details
router.get('/:id', protect, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    res.json({ success: true, interview });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch interview' });
  }
});

// GET /api/interviews/stats/overview — Dashboard stats
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user._id, status: 'completed' })
      .sort({ completedAt: -1 });

    const domainStats = {};
    const scoreHistory = [];
    const recentInterviews = interviews.slice(0, 5);

    interviews.forEach(interview => {
      if (!domainStats[interview.domain]) {
        domainStats[interview.domain] = { count: 0, totalScore: 0, avgScore: 0 };
      }
      domainStats[interview.domain].count++;
      domainStats[interview.domain].totalScore += interview.overallScore;
      domainStats[interview.domain].avgScore = Math.round(
        domainStats[interview.domain].totalScore / domainStats[interview.domain].count
      );

      scoreHistory.push({
        date: interview.completedAt,
        score: interview.overallScore,
        domain: interview.domain,
        difficulty: interview.difficulty
      });
    });

    res.json({
      success: true,
      stats: {
        totalInterviews: interviews.length,
        averageScore: interviews.length > 0 
          ? Math.round(interviews.reduce((s, i) => s + i.overallScore, 0) / interviews.length) 
          : 0,
        bestScore: interviews.length > 0 ? Math.max(...interviews.map(i => i.overallScore)) : 0,
        domainStats,
        scoreHistory: scoreHistory.slice(-20),
        recentInterviews
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// DELETE /api/interviews/:id — Abandon interview
router.delete('/:id', protect, async (req, res) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'in-progress' },
      { status: 'abandoned' },
      { new: true }
    );
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    res.json({ success: true, message: 'Interview abandoned' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to abandon interview' });
  }
});

module.exports = router;
