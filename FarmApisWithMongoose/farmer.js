const mongoose = require("mongoose");

// Define the schema for the crop
const cropSchema = new mongoose.Schema({
  cropId: { type: Number, required: true },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  category: { type: String, required: true },
});

// Define the schema for the farmer
const farmerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  farmLocation: { type: String, required: true },
  farmerId: { type: Number, unique: true, required: true },
  producedCrops: [cropSchema], // Array of crops
});

// Create the model
const Farmer = mongoose.model("Farmer", farmerSchema);

module.exports = Farmer;