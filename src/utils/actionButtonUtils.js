
/**
 * Setting the action button for user for admin usage
 * @param {object} user - User object 
 * @returns {Array<{ title: string, color: string }>} - List of user action buttons
 */
const userActionButton = (user) => {
    const  actions = []

    user.isBan? actions.push({title: "Unban", color: 'orange'}): actions.push({title:'Ban', color: 'orange'});
    user.isBlock? actions.push({title:'Unblock', color: 'red'}): actions.push({title: 'Block', color: 'red'});
    user.isVerified? actions.push({title: 'Expiration', color: 'green'}): actions.push({title: 'Premium', color: 'green'});
    return actions;
}

/**
 * Setting action button for post for admin usage 
 * @param {object} post -  Post object
 * @returns {Array<{ title: string, color: string }>} - List of post action buttons
 */
const postActionButton = (post)=> {
    const actions = [];
    post.isRestricted ? actions.push({title: 'Unrestrict', color: 'red'}): actions.push({title: 'Restrict', color: 'red'});
    post.isPostBoost? actions.push({title: 'Status', color: 'green'}): actions.push({title: 'Boost Post' , color: 'green'});
    return actions;
}   

/**
 * Setting action button for reports for admin usage 
 * @param {object} report 
 * @returns {Array<{ title: string, color: string }>} - List of report action buttons
 */
const reportActionButton = (report) => {
    const actions = [{title: 'View Details',  color: 'blue'}];
    return actions
    
}

module.exports ={ 
    userActionButton,
    postActionButton,
    reportActionButton
}