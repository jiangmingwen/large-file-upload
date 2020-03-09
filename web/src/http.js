export default function ({
    url,
    method = "POST",
    data,
    headers = {},
    onprogress,
    requestList
}) {
    return new Promise(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = onprogress;
        xhr.open(method, url);
        Object.keys(headers).forEach(key =>
            xhr.setRequestHeader(key, headers[key])
        );

        xhr.send(data);
        xhr.onload = e => {
            resolve({ data: JSON.parse( e.target.response )});
            if(requestList){
                let xhrIndex = requestList.findIndex(item => item === xhr);
                requestList.splice(xhrIndex,1);
            }
        };

        if(requestList){
            requestList.push(xhr);
        }
    });
}