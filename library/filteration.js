

const userActionButton = (user) => {
    const  actions = []

    user.isBan? actions.push({title: "Unban", color: 'orange'}): actions.push({title:'Ban', color: 'orange'});
    user.isBlock? actions.push({title:'Unblock', color: 'red'}): actions.push({title: 'Block', color: 'red'});
    user.isVerified? actions.push({title: 'Expiration', color: 'green'}): actions.push({title: 'Premium', color: 'green'});
    return actions;
}

const postActionButton = (post)=> {

}

module.exports ={ 
    userActionButton,
    postActionButton,
}