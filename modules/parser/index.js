const { Worker } = require("worker_threads");
const EventEmitter = require('events');
const { trimLastSplash } = require('../helpers');

const EVENTS_ENUM = {
  TODO_LIST_UPDATED: 'TODO_LIST_UPDATED',
  FINISHED: 'FINISHED',
}

class Parser extends EventEmitter {
  url;
  threadsCount;
  todoList = [];
  checkedList = {};
  timeout;

  constructor(url, threadsCount, timeoutSeconds) {
    super();
    try {
      this.url = new URL(url);
      this.threadsCount = parseInt(threadsCount, 10);
      this.timeout = parseInt(timeoutSeconds, 10) * 1000;
      this.initListeners();
    } catch (error) {
      console.error(error);
    }
  }
  
  initListeners = () => {
    this.on(EVENTS_ENUM.TODO_LIST_UPDATED, this.toDoHandler);
  }

  start = async () => {
    const data = await this.worker(this.url.href);
    this.addToCheckedList(data.currentUrl, data.status);
    this.setToDoList(data.urls);
  }

  worker = (url) => new Promise(((resolve, reject) => {
    const worker = new Worker('./modules/page-grabber/index.js', {
      workerData: {
        url,
        timeout: this.timeout,
      }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    })
  }));

  addToCheckedList = (url, status) => {
    this.checkedList = {
      ...this.checkedList,
      [url]: status
    }
  }

  clearQueryParams = (link) => {
    try {
      const [url] = link.split('?');
      return trimLastSplash(url);
    } catch (error) {
      console.error(error);
    }
  }

  setToDoList = (links) => {
    const checkedLinks = Object.keys(this.checkedList);
    const queryCleared = links.map((link) => this.clearQueryParams(link));
    const filtered = queryCleared.filter((link) => !checkedLinks.includes(link));
    const unique = new Set(filtered);
    this.todoList = [...unique];
    this.emit(EVENTS_ENUM.TODO_LIST_UPDATED);
  }
  
  toDoHandler = async () => {
    if (!this.todoList.length) {
      this.emit(EVENTS_ENUM.FINISHED, this.checkedList);
      return;
    }

    let responsesStore = [];
    for (let i = 0; i < this.todoList.length; i+= this.threadsCount) {
      const resp = await Promise.all(this.todoList.slice(i, i + this.threadsCount).map((url) => this.worker(url)));
      responsesStore = [
          ...responsesStore,
          ...resp
      ];
    }

    let toDO = [];
    responsesStore.forEach((response) => {
      toDO = [ ...toDO, ...response.urls, ];
      this.addToCheckedList(response.currentUrl, response.status);
    });

    this.setToDoList(toDO);
  }
}

module.exports = {
  Parser,
  EVENTS_ENUM
}