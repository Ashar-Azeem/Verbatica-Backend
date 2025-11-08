const axios = require('axios');


const classifyTopLevelComment = async (comment, labels) => {
    //Change the IP to the cloud ip that we would be using
    const res = await axios.post("http://localhost:8000/classify", {
        comment: comment,
        clusters: labels,
    });
    return res.data;
}

module.exports = classifyTopLevelComment;