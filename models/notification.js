const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');


//Follow this template for the model functions
const notificationModel = {
    async addNotification() {
        try {
            //This is your database connection object
            const { postgres } = await connectAll();
            //Code here


        } catch (e) {
            throw Error(e);
        }
    }

}


module.exports = notificationModel;