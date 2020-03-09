let pubSub = {
    eventList:{},
    subscribe (event,fn){
        if(!this.eventList[event]){
            this.eventList[event] =[]
        }
        this.eventList[event].push(fn)
    },
    next(...args){
        let event = args[0];
        let fns = this.eventList[event];
        if(!fns || !fns.length) {return}
        fns.forEach(item => {
            item(args)
        });
    },
    unsubscribe(event){
        delete this.eventList[event];
    }
}

export default pubSub;