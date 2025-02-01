

const userActionButton = (user) => {
    const  actions = []

    user.isBan? actions.push({title: "Unban", color: 'orange'}): actions.push({title:'Ban', color: 'orange'});
    user.isBlock? actions.push({title:'Unblock', color: 'red'}): actions.push({title: 'Block', color: 'red'});
    user.isVerified? actions.push({title: 'Expiration', color: 'green'}): actions.push({title: 'Premium', color: 'green'});
    return actions;
}

const postActionButton = (post)=> {
    const actions = [];
    post.isRestricted ? actions.push({title: 'Unrestrict', color: 'red'}): actions.push({title: 'Restrict', color: 'red'});
    post.isPostBoost? actions.push({title: 'Status', color: 'green'}): actions.push({title: 'Boost Post' , color: 'green'});
    return actions;
}   

const reportActionButton = (report) => {
    const actions = [{title: 'View Details',  color: 'blue'}];
    return actions
    
}

module.exports ={ 
    userActionButton,
    postActionButton,
    reportActionButton
}