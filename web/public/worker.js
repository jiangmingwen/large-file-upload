
importScripts('spark-md5.min.js');

self.onmessage = e => {
    console.log(e)
    const spark = new self.SparkMD5.ArrayBuffer();
    const { fileChunkList } = e.data;
    //work线程里也不能用for循环，全部读取，不然也会卡顿
    //work线程里只能一个一个加载，加载完毕后告诉主线程
    const loadNext = index => {
        let file = fileChunkList[index].file;//每个切片的file
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = e => {
            spark.append(e.target.result);
            self.postMessage({
                percent: (index + 1) / fileChunkList.length * 100,
                hash: (index == fileChunkList.length - 1) ? spark.end() : loadNext(index + 1)
            })
        }
    }

    loadNext(0);
}
