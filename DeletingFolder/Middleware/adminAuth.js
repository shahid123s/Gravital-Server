const {decodeAccessToken} = require('../Config/jwt');


const authenticateAdmin = async (req, res, next) => {
    const authHead = req.headers['authorization'];
    const  token = authHead &&  authHead.split(' ')[1];
    
    if(!token) {
    
        return res.status(401)
        .json({message : 'AccessToken Required'});
    }
    

    try {
       const decode = await decodeAccessToken(token);
        if(decode.role != 'admin'){
        console.log('nokkanam role');

            return res.status(401).json({message: 'Invalid Token'})
        }
        
        req.user = decode;
        next();

    } catch (error) {

        console.log(error.message,);
        console.log('nokkanam role');

        return res.status(401).json({message: 'Invalide or Expire Token '})
    }
}


module.exports = authenticateAdmin;