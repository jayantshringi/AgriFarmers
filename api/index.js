const { handleApiRequest } = require('../server');

module.exports = async (req, res) => {
    return handleApiRequest(req, res);
};
