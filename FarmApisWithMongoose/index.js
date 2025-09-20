const express = require("express")
const fs = require("fs")
const cors = require('cors')
const mongoose = require('mongoose');
const app = express()
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./User.js");

const PORT = 2000
app.use(express.json())
app.use(cors());  
const Farmer = require("./farmer.js"); 
const seo = require("./SEO.json")

mongoose.connect("mongodb+srv://aasheeta:iqFUUU3ZZ1YGIO5b@farmer.pizusws.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true, 
    serverSelectionTimeoutMS: 30000, // Set a higher timeout if needed
  })
    .then(() => console.log('MongoDB connected successfully!'))
    
    .catch((error) => console.error('MongoDB connection failed:', error.message));
    
  app.route('/api/seounits/').get((req, res) => {
      return res.json(seo);
  })
    
app.route("/farmers").get(async (req, res, next) => {
  try {
    const farmers = await Farmer.find(); // Fetch all farmers from the database
    res.json({ status: "success", data: farmers });
  } catch (err) {
    next(err);
  }
})

.post(async (req, res, next) => {
  try {
    const body = req.body;

    // Validate required fields
    if (!body.name || !body.contact || !body.contact.phone || !body.contact.email) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: name, phone, or email.",
      });
    }

    // Generate farmerId dynamically and check if it exists
    let newFarmerId = await Farmer.countDocuments() + 1;
    let farmerExists = await Farmer.exists({ farmerId: newFarmerId });
    while (farmerExists) {
      newFarmerId++;  // Increment farmerId if it already exists
      farmerExists = await Farmer.exists({ farmerId: newFarmerId });
    }

    // Create a new Farmer document
    const newFarmer = new Farmer({
      ...body,
      farmerId: newFarmerId, // Set the unique farmerId
      producedCrops: [], // Initialize with an empty array
    });

    // Save the farmer to the database
    const savedFarmer = await newFarmer.save();

    res.json({ status: "success", data: savedFarmer });
  } catch (err) {
    next(err);
  }
});


app.route("/farmers/:farmerId")
    .get(async (req, res, next) => {
      try {
        const farmerId = req.params.farmerId; // Extract farmerId from the URL
        const farmer = await Farmer.findOne({ farmerId: farmerId }); // Find the farmer by farmerId
  
        if (!farmer) {
          return res.status(404).json({
            status: "error",
            message: `Farmer with ID ${farmerId} does not exist`,
          });
        }
  
        return res.json({
          status: "success",
          data: farmer,
        });
      } catch (err) {
        next(err); // Pass error to the next middleware (error handler)
      }
    })
  
    // Route to delete a farmer by ID
    .delete(async (req, res, next) => {
      try {
        const farmerId = req.params.farmerId; // Extract farmerId from the URL
  
        // Delete the farmer by farmerId
        const result = await Farmer.deleteOne({ farmerId: farmerId });
  
        if (result.deletedCount === 0) {
          return res.status(404).json({
            status: "error",
            message: `Farmer with ID ${farmerId} not found`,
          });
        }
  
        return res.json({
          status: "success",
          message: `Farmer with ID ${farmerId} and their crops have been deleted`,
        });
      } catch (err) {
        next(err); // Pass error to the next middleware (error handler)
      }
    })
      // PATCH: Update a farmer (partially)

      .patch(async (req, res) => {
        try {
          const farmerId = req.params.farmerId; // Use the correct parameter name
          // Update the farmer's fields partially
          const updatedFarmer = await Farmer.findOneAndUpdate(
            { farmerId: parseInt(farmerId) }, // Ensure farmerId is an integer
            { $set: req.body },  // This updates only the fields passed in the request body
            { new: true }  // Return the updated document
          );
    
          if (!updatedFarmer) {
            return res.status(404).json({ message: 'Farmer not found' });
          }
    
          return res.json({ status: 'success', updated: updatedFarmer });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to update the farmer' });
        }
      })
  
    // PUT: Replace a farmer's data
    .put(async (req, res) => {
      try {
        const farmerId = req.params.farmerId; // Use the correct parameter name
        // Replace the farmer's data with the provided data
        const updatedFarmer = await Farmer.findOneAndReplace(
          { farmerId: parseInt(farmerId) }, // Ensure farmerId is an integer
          req.body,  // The new data for the farmer
          { new: true }
        );
  
        if (!updatedFarmer) {
          return res.status(404).json({ message: `Farmer with id ${farmerId} not found` });
        }
  
        return res.json({ status: 'success', updated: updatedFarmer });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to replace the farmer' });
      }
    });
  
    // ✅ Get all crops of all farmers
app.route('/crops').get(async (req, res, next) => {
  try {
    // Fetch all farmers
    const farmers = await Farmer.find();

    // Collect all crops with farmer info
    const allCrops = farmers.flatMap(farmer =>
      farmer.producedCrops.map(crop => ({
        farmerId: farmer.farmerId,
        farmerName: farmer.name,
        farmLocation: farmer.farmLocation,
        ...crop
      }))
    );

    return res.json({
      status: 'success',
      totalCrops: allCrops.length,
      crops: allCrops
    });
  } catch (err) {
    next(err);
  }
});

     
    app.route('/farmers/:farmerId/crops').post(async (req, res, next) => {
        try {
          const farmerId = req.params.farmerId; // Get farmerId from URL
          const body = req.body;
      
          // Validate if the farmer exists
          const farmer = await Farmer.findOne({ farmerId: farmerId });
          if (!farmer) {
            return res.status(404).json({
              status: 'error',
              message: `Farmer with ID ${farmerId} not found`,
            });
          }
      
          // Destructure the body and check for required fields
          const { cropName, quantity, pricePerUnit, category } = body;
          if (!cropName || !quantity || !pricePerUnit || !category) {
            return res.status(400).json({
              status: 'error',
              message: 'Missing required fields: cropName, quantity, pricePerUnit, and category.',
            });
          }
      
          // Validate category
          const validCategories = ['Grains', 'Vegetables', 'Fruits'];
          if (!validCategories.includes(category)) {
            return res.status(400).json({
              status: 'error',
              message: `Invalid category. Valid categories are: ${validCategories.join(', ')}.`,
            });
          }
      
          // Create new crop object
          const newCrop = {
            cropId: farmer.producedCrops.length + 1, // Auto-generate cropId based on current length
            cropName,
            quantity,
            pricePerUnit,
            category,
          };
      
          // Push the new crop to the farmer's producedCrops array
          farmer.producedCrops.push(newCrop);
      
          // Save the updated farmer document to the database
          await farmer.save();
      
          return res.json({
            status: 'success',
            message: 'Crop added successfully',
            farmer,
          });
        } catch (err) {
          next(err); // Pass any errors to the next middleware (error handler)
        }
      });
      
      app.delete('/farmers/:farmerId/crops/:cropId', async (req, res, next) => {
          try {
              const { farmerId, cropId } = req.params;
      
              // Find the farmer by ID
              const farmer = await Farmer.findOne({ farmerId: parseInt(farmerId, 10) });
      
              if (!farmer) {
                  return res.status(404).json({
                      status: 'error',
                      message: `Farmer with ID ${farmerId} not found`,
                  });
              }
      
              // Find the index of the crop to be deleted
              const cropIndex = farmer.producedCrops.findIndex(
                  (crop) => crop.cropId === parseInt(cropId, 10)
              );
      
              if (cropIndex === -1) {
                  return res.status(404).json({
                      status: 'error',
                      message: `Crop with ID ${cropId} not found for this farmer`,
                  });
              }
      
              // Remove the crop from the producedCrops array
              farmer.producedCrops.splice(cropIndex, 1);
      
              // Save the updated farmer record to the database
              await farmer.save();
      
              // Respond with a success message
              return res.json({
                  status: 'success',
                  message: `Crop with ID ${cropId} removed from farmer with ID ${farmerId}`,
              });
          } catch (err) {
              next(err);
          }
      });

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
      
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      "supersecretkeyaaa",
      { expiresIn: "1h" }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
  
