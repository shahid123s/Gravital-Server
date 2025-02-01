const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hassedPassword = await bcrypt.hash(password, salt)
        return hassedPassword;

    } catch (error) {
        console.log(`${error.message} happens in hashing the password`)
    }
};


const comparePassword = async (password, userPassword) => {
    try {
        let checkedPassword = await bcrypt.compare(password, userPassword)
        return checkedPassword;

    } catch (error) {
        console.log(`${error.message} happens in comparing password`)
    }
}

module.exports = {
    hashPassword,
    comparePassword,
}