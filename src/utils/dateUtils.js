/**
 * Convert a date to a DD/MM/YY format
 * @param {Date} date - The date to be converted
 * @returns {string} - The formatted date in DD/MM/YY format
 */
const convertDateToDDMMYY = (date) => {
    const currentDate = new Date(date);
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: '2-digit' }).format(currentDate);
}

/**
 * Convert a date to a DD/MM/YY format
 * @param {Date} date - The date to be converted
 * @returns {string} - The formatted date in MM/YY format
 */
const convertDateToMMYY = (date) => {
    const currentDate = new Date(date);
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(currentDate);
}

module.exports = {
    convertDateToDDMMYY,
    convertDateToMMYY,
}