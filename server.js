// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Student Schema
const studentSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: [true, 'Student name is required']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function(v) {
                return /^\d{10,15}$/.test(v.replace(/[- ()+]/g, ''));
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        },
        unique: true
    },
    program: {
        type: String
    },
    address: {
        type: String,
        required: [true, 'Address is required']
    },
    idCardNumber: {
        type: String,
        required: [true, 'ID card number is required'],
        unique: true
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['Male', 'Female', 'Other']
    },
    dob: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    regNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create Student model
const Student = mongoose.model('Student', studentSchema);

// API Routes
// Get all students
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find({}).select('-__v');
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
});

// Get student by ID
app.get('/api/students/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select('-__v');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student', error: error.message });
    }
});

// Create new student
app.post('/api/students', async (req, res) => {
    try {
        // Check if email already exists
        const existingEmail = await Student.findOne({ email: req.body.email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email is already registered' });
        }
        
        // Check if ID card number already exists
        const existingIdCard = await Student.findOne({ idCardNumber: req.body.idCardNumber });
        if (existingIdCard) {
            return res.status(400).json({ message: 'ID card number is already registered' });
        }
        
        // Create new student
        const newStudent = new Student(req.body);
        const savedStudent = await newStudent.save();
        
        res.status(201).json({
            message: 'Student registered successfully',
            student: savedStudent
        });
    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation error', errors: validationErrors });
        }
        
        res.status(500).json({ message: 'Error registering student', error: error.message });
    }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.status(200).json({
            message: 'Student updated successfully',
            student: updatedStudent
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation error', errors: validationErrors });
        }
        
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
    try {
        const deletedStudent = await Student.findByIdAndDelete(req.params.id);
        
        if (!deletedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student', error: error.message });
    }
});
// Admin dashboard route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve admin-specific assets
app.get('/admin-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-styles.css'));
});

app.get('/admin-script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-script.js'));
});

// Serve the main HTML file for any other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});