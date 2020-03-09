var express = require('express');
var router = express.Router();
const path = require("path");
var fse = require('fs-extra');
const UPLOAD_DIR = path.resolve(__dirname, "..", "file_target");

/* GET home page. */
router.post('/', async function (req, res, next) {

    const { fileHash } = req.body;

    const filePath = `${UPLOAD_DIR}/${fileHash}`;
    fse.exists(filePath, (exist) => {
        res.end(JSON.stringify({
            code: 0,
            data: exist
        }))
    })
});

module.exports = router;
