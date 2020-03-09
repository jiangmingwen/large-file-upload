<template>
  <div>
    <div class="progress-box">
      <div class="label">总进度:</div>
      <div class="progress">
        <div class="value" :style="{'width': progress + '%'}">{{progress}}%</div>
        <div class="msg">{{message}}</div>
      </div>
      <div class="detail" @click="onDetail" v-if="cupList.length">详情 {{display?'∧':'∨'}}</div>
    </div>

    <div class="detail-list" v-if="display">
      <div class="tr">
        <div class="td title">切片hash</div>
        <div class="td size">大小(KB)</div>
        <div class="td percent">进度</div>
      </div>
      <div class="detail-body">
        <div class="tr" v-for="(item,index) in cupList" :key="index">
          <div class="td title">{{item.hash}}</div>
          <div class="td size">{{item.size}}</div>
          <div class="td percent">
            <div class="progress detail-progress">
              <div class="value" :style="{'width': item.progress + '%'}"></div>
            </div>
            <div class="text">{{item.progress}}%</div>
          </div>
        </div>
      </div>
    </div>

    <input type="file" multiple="false" ref="file" @change="onFileChange">
    <button @click="onUpload" :disabled="loading">{{loading?'上传中':'上传'}}</button>
    <button @click="onPause">{{ status ?'继续': '暂停'}}</button>
  </div>
</template>

<script>
const PER_SIZE = 10 * 1024 * 1024; //每份的大小为1024KB
const HTTP_LIMIT = 5; //允许最多同时并发的切片数量

import pub from "./observal.js";
import request from "./http.js";
import SparkMD5 from "spark-md5";

export default {
  data() {
    return {
      loading: false,
      data: [],
      file: null,
      progress: 0,
      cupList: [],
      display: false,
      cupCount: 1,
      uploadCount: 0,
      worker: null,
      hash: "",
      message: "",
      show: false,
      xhrList: [],
      status: false//true为继续
    };
  },
  methods: {
    async onPause() {
      console.log(this.xhrList, "xhrList");
      if (this.status) {
        //继续
        await this.uploadChunks(this.data);
        this.loading = false;
      } else {
        //暂停
        this.xhrList.forEach(item => {
          if (item.abort) {
            item.abort();
          }
        });
        alert("暂停成功");
        this.xhrList = [];
      }
      this.status = !this.status;
    },
    onDetail() {
      this.display = !this.display;
    },
    onFileChange(e) {
      this.file = e.target.files[0];
      this.progress = 0;
      this.uploadCount = 0;
    },
    async onUpload() {
      this.status =false;
      if (!this.file) {
        alert("请选择文件");
        return;
      }
      this.loading = true;
      const fileChunkList = this.createFileChunk(this.file);
      console.log(fileChunkList, "fileChunkList");
      this.cupCount = Math.ceil(this.file.size / PER_SIZE);
      this.hash = await this.getFileHash(fileChunkList);

      this.data = fileChunkList.map(({ file }, index) => ({
        fileHash: this.hash,
        index,
        hash: this.hash + "-" + (index + 1),
        chunk: file,
        size: file.size
      }));
      this.progress = 0;
      this.uploadCount = 0;
      let checkData = await this.checkExist(this.hash);
      console.log(checkData, "checkData");
      if (checkData.data && checkData.data.data) {
        this.message = "秒传成功";
        this.progress = 100;
      } else {
        await this.uploadChunks(this.data);
      }
      this.loading = false;
    },
    checkExist(fileHash) {
      return request({
        url: "http://192.168.2.108:3000/checkExist",
        data: JSON.stringify({ fileHash }),
        headers: { "Content-Type": "application/json" }
      });
    },
    /**
     * 根据切片生成整个文件的hash值
     * @param fileChunkList 文件的切片数组
     */
    getFileHash(fileChunkList) {
      return new Promise(resolve => {
        this.worker = new Worker("/worker.js");
        this.worker.postMessage({ fileChunkList });
        this.worker.onmessage = e => {
          if (e.data.percent == 100) {
            resolve(e.data.hash);
          }
          this.progress = Math.floor(e.data.percent);
          this.message = "校验文件中";
        };
      });
    },
    createFileChunk(file, perSize = PER_SIZE) {
      const fileChunkList = [];
      if (file.size <= perSize) {
        fileChunkList.push({
          file
        });
      } else {
        let cur = 0;
        while (cur < file.size) {
          fileChunkList.push({ file: file.slice(cur, cur + perSize) });
          cur += perSize;
        }
      }
      return fileChunkList;
    },

    async uploadChunks(chunkList) {
      this.xhrList = [];
      this.cupList = [];
      this.message = "切片上传中";
      const requestList = chunkList
        .map(({ chunk, hash }) => {
          const formData = new FormData();
          formData.append("chunk", chunk);
          formData.append("hash", hash);
          formData.append("filename", this.file.name);
          formData.append("fileHash", this.hash);
          formData.append("total", this.file.size);
          return { formData, hash, size: chunk.size };
        })
        .forEach(({ formData, hash, size }, index) => {
          this.cupList.push({
            hash: hash,
            size: size,
            progress: 0
          });

          request({
            url: "http://192.168.2.108:3000/upload",
            data: formData,
            onprogress: e => {
              console.log(e, "进度");
              this.cupList[index].progress = Math.floor(
                (e.loaded / e.total) * 100
              );
            },
            requestList: this.xhrList
          }).then(res => {
            console.log(res, "切片消息");
            if (res.data.code == 0) {
              if(  this.uploadCount  <  this.cupCount-1){
                this.uploadCount += 1;
              }
              this.progress = Math.floor(
                (this.uploadCount / this.cupCount) * 100
              );
              console.log(this.uploadCount, this.cupCount, "成功");
            } else if (res.data.code == 1) {
              //整个文件上传成功
              this.progress = 100;
            }
          });
        });
    }
  },
  mounted() {
  }
};
</script>
<style>
.progress-box {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}
.progress {
  width: 100%;
  height: 12px;
  line-height: 12px;
  border: 1px solid #d8d8d8;
}

.progress.detail-progress {
  height: 5px;
}

.progress.detail-progress .value {
  background-color: aqua;
}

.label {
  width: 100px;
  padding-right: 16px;
  text-align: right;
}
.value {
  width: 0%;
  height: 100%;
  background-color: blueviolet;
  text-align: right;
  color: #fff;
  font-size: 12px;
  transition: width linear 0.3s;
}
.msg {
  margin-top: 10px;
}

.detail {
  width: 80px;
  color: rgb(9, 189, 63);
  cursor: pointer;
  padding: 0 16px;
}

.tr {
  display: flex;
  text-align: center;
  padding: 10px 0;
  border-bottom: 1px solid #d8d8d8;
}

.td.title {
  width: 350px;
}

.td.size {
  width: 300px;
}

.td.percent {
  flex: 1;
  display: flex;
  align-items: center;
}

.td.percent .text {
  padding: 0 16px;
}

.detail-body {
  height: 300px;
  overflow-y: auto;
}

button {
  margin-right: 16px;
}
</style>
