const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  userAnswer: { type: String, default: '' },
  feedback: { type: String, default: '' },
  score: { type: Number, default: 0, min: 0, max: 10 },
  timeSpent: { type: Number, default: 0 }, // in seconds
  skipped: { type: Boolean, default: false }
});

const interviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true,
    enum: [
      'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js',
      'Data Structures', 'Algorithms', 'System Design', 'Database',
      'Machine Learning', 'DevOps', 'Cybersecurity', 'PHP', 'TypeScript',
      'Vue.js', 'Angular', 'MongoDB', 'SQL', 'AWS', 'Docker'
    ]
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  questions: [questionSchema],
  totalQuestions: { type: Number, default: 5 },
  currentQuestion: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  overallFeedback: { type: String, default: '' },
  cameraEnabled: { type: Boolean, default: false },
  duration: { type: Number, default: 0 }, // total time in seconds
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Calculate overall score before saving
interviewSchema.pre('save', function(next) {
  if (this.questions.length > 0 && this.status === 'completed') {
    const answered = this.questions.filter(q => !q.skipped && q.score > 0);
    if (answered.length > 0) {
      const total = answered.reduce((sum, q) => sum + q.score, 0);
      this.overallScore = Math.round((total / (answered.length * 10)) * 100);
    }
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Interview', interviewSchema);
