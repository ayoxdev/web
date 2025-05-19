// models/Selection.js
const mongoose = require('mongoose');

const SelectionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  forcedColors: [String],
  maxChoices: Number,
  availableColors: [String],
  selectedColors: [String],
  submitted: { type: Boolean, default: false },
  submittedAt: Date
});

module.exports = mongoose.model('Selection', SelectionSchema);
