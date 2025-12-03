const axios = require('axios');


const createEmbeddings = async (post) => {
    //Change the IP to the cloud ip that we would be using
    const res = await axios.post(process.env.EMBEDDINGROUTE, {
        texts: post,
    });
    return res.data.embeddings[0];
}

module.exports = createEmbeddings;