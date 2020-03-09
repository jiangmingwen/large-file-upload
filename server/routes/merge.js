var express = require('express');
var router = express.Router();
const path = require("path");
var fse = require('fs-extra');
const UPLOAD_DIR = path.resolve(__dirname, "..", "target");
// const UPLOAD_DIR = 'H:/file/merge'


 const mergeFileChunk = async (filePath,filename) =>{
     const chunkDir = `H:/file/${filename}`;
     const chunkPaths = await fse.readdir(chunkDir);
     await fse.writeFile(filePath, "",(err=>{
         console.log(err,'写进去了')
     }));
    
     chunkPaths.forEach(chunkPath => {
         console.log(chunkPath,'chunkPath')
        fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}/${chunkPath}`));
        fse.unlinkSync(`${chunkDir}/${chunkPath}`);
     })
     fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
 }

/* GET home page. */
router.post('/', async function(req, res, next) {
//   res.render('index', { title: 'merge' });
    // const data = await resolvePost(req);
    const {filename} = req.body;
    console.log(req.body,UPLOAD_DIR,'data')
    
    const filePath=`${UPLOAD_DIR}/${filename}`;
    await mergeFileChunk(filePath,filename);
    res.end(JSON.stringify({
        code: 0,
        message:'file merge success'
    }))


});

module.exports = router;
