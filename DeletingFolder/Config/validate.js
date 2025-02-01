const validateInput = (data) => {
    const errors = {};
    

    if (data?.fullName) {
        const nameRegex = /^[A-Za-z\s]{3,}$/;
        if (!nameRegex.test(data.fullName)) {
            errors.fullName = "Full name must contain only alphabets and be at least 3 characters long.";
        }
    }


    if (data?.username) {
        const usernameRegex = /^[A-Za-z0-9_]{5,}$/;
        if (!usernameRegex.test(data.username)) {
            errors.username = "Username must contain only letters, numbers, underscores, and be at least 5 characters.";
        }
    }


    if (data?.phoneNumber) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(data.phoneNumber)) {
            errors.phoneNumber = "Phone number must be exactly 10 digits.";
        }
    }


    if (data?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.email = "Please provide a valid email address.";
        }
    }

    // Password validation
    if (data?.password) {
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(data.password)) {
            errors.password = "Password must be at least 8 characters long, include uppercase, lowercase, a number, and a special character.";
        }
    }

    return errors;
};

module.exports = validateInput;