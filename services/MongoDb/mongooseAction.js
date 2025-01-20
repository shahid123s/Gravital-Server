const { default: mongoose } = require("mongoose")

const convertStringToObjectID = async (id) => {
    return await new mongoose.Types.ObjectId(id)
}

module.exports = {
    convertStringToObjectID
}