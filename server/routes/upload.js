var express = require('express');
var router = express.Router();
var fse = require('fs-extra');
var multiparty = require('multiparty');
var fileList = {};
const path = require("path");
const UPLOAD_DIR = path.resolve(__dirname, "..", "file_target");
const CUP_DIR = 'H:/cup_dir'

/* GET home page. */
router.post('/', function (req, res, next) {
    //   res.render('index', { title: 'upload' });
    const multipart = new multiparty.Form();
    multipart.parse(req, async (err, fields, files) => {
        if (err) {
            return
        }

        const [chunk] = files.chunk;
        const [hash] = fields.hash;
        const [filename] = fields.filename;
        const [total] = fields.total;
        const [fileHash] = fields.fileHash;
        const chunkDir = `${CUP_DIR}/${fileHash}`;



        // 切片目录不存在，创建切片目录
        if (!fse.existsSync(chunkDir)) {
            await fse.mkdirs(chunkDir);
        }
        if(!fse.existsSync(`${chunkDir}/${hash}`)){//如果存在这个，就说明这个切片上传过？
            await fse.move(chunk.path, `${chunkDir}/${hash}`);
            if (!fileList[filename]) {
                fileList[filename] = 0;
            }
            fileList[filename] += chunk.size;
        }
        console.log(chunk.size, fileList[filename], total, '数量')
        if (fileList[filename] >= total) {//全部切片上传完毕，可以合并了
            const filePath = `${UPLOAD_DIR}/${fileHash}`;
            await mergeFileChunk(filePath, fileHash,filename);
            delete fileList[filename];//删除文件数量的缓存，释放内存
            res.end(JSON.stringify({
                code: 1,
                message: '文件上传成功'
            }))
        } else {
            res.end(JSON.stringify({
                code: 0,
                messge: '切片上传成功'
            }))
        }
    })
});




const mergeFileChunk = async (filePath, fileHash, filename) => {
    const chunkDir = `${CUP_DIR}/${fileHash}`;
    const chunkPaths = await fse.readdir(chunkDir);
    if (!fse.existsSync(filePath)) {
        await fse.mkdirs(filePath);
    }
    filePath = `${filePath}/${filename}`
    await fse.writeFile(filePath, "", (err => {
        console.log(err, '写进去了')
    }));
    let chunkPaths_ = chunkPaths.sort((a, b) =>
        b.substring(b.lastIndexOf("-")) - a.substring(a.lastIndexOf("-"))
    )
    chunkPaths_.forEach(chunkPath => {
        console.log(chunkPath, 'chunkPath')
        fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}/${chunkPath}`));
        fse.unlinkSync(`${chunkDir}/${chunkPath}`);
    })
    fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
}




module.exports = router;
