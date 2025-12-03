const { InferenceClient } = require("@huggingface/inference");

const client = new InferenceClient(process.env.EMBEDDINGKEY);

const createEmbeddings = async (post) => {
    const output = await client.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: post,
    });

    return output[0];
}

module.exports = createEmbeddings;









//If someday the inference is over:
//  const axios = require('axios');
// const createEmbeddings = async (post) => {
//     //Change the IP to the cloud ip that we would be using
//     const res = await axios.post(process.env.EMBEDDINGROUTE, {
//         texts: post,
//     });
//     return res.data.embeddings[0];
// }
