(() => {
  'use strict';

  const DB_NAME = 'dyson-local-artworks';
  const DB_VERSION = 1;
  const STORE_NAME = 'artworks';
  const MAX_ARTWORKS = 12;
  let openPromise = null;

  function friendlyError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function storageError(error) {
    if (error && error.code) return error;
    if (error && error.name === 'QuotaExceededError') {
      return friendlyError('这台设备的存储空间不够啦。先下载图片，再到相册删除不需要的作品。', 'QUOTA');
    }
    return friendlyError('浏览器暂时打不开本机相册。画画和下载图片仍然可以继续。', 'STORAGE');
  }

  function openDatabase() {
    if (openPromise) return openPromise;
    openPromise = new Promise((resolve, reject) => {
      let request;
      try {
        if (!window.indexedDB) {
          reject(friendlyError('这个浏览器暂时不能保存本机相册，请先下载图片。', 'UNSUPPORTED'));
          return;
        }
        request = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(storageError(error));
        return;
      }
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => { database.close(); openPromise = null; };
        resolve(database);
      };
      request.onerror = () => reject(storageError(request.error));
      request.onblocked = () => reject(friendlyError('请先关掉其他打开着的相册页面，再试着保存；也可以直接下载图片。', 'BLOCKED'));
    }).catch((error) => { openPromise = null; throw error; });
    return openPromise;
  }

  async function list() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      let records = [];
      let transaction;
      try {
        transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => { records = request.result; };
      } catch (error) { reject(storageError(error)); return; }
      transaction.oncomplete = () => resolve(records
        .filter((record) => record && record.blob instanceof Blob)
        .sort((a, b) => b.createdAt - a.createdAt));
      transaction.onerror = () => reject(storageError(transaction.error));
      transaction.onabort = () => reject(storageError(transaction.error));
    });
  }

  async function save({ name, blob, width, height }) {
    if (!(blob instanceof Blob) || !blob.size || !blob.type.startsWith('image/')) {
      throw friendlyError('这张图片还没有准备好，请再点一次“存到相册”。', 'INVALID_IMAGE');
    }
    const database = await openDatabase();
    const createdAt = Date.now();
    const record = {
      id: `${createdAt}-${Math.random().toString(36).slice(2, 10)}`,
      name: String(name || '我的小画作').trim().slice(0, 80) || '我的小画作',
      createdAt,
      width: Math.round(Number(width)) || 2000,
      height: Math.round(Number(height)) || 1280,
      blob,
    };
    return new Promise((resolve, reject) => {
      let transaction;
      let failure = null;
      try {
        transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const count = store.count();
        count.onsuccess = () => {
          if (count.result >= MAX_ARTWORKS) {
            failure = friendlyError('相册里已经有 12 张作品啦。先去相册删除一张，再保存新的画作。', 'FULL');
            transaction.abort();
            return;
          }
          store.add(record);
        };
      } catch (error) { reject(storageError(error)); return; }
      transaction.oncomplete = () => { window.dispatchEvent(new Event('dyson-artworks-changed')); resolve(record); };
      transaction.onerror = () => reject(failure || storageError(transaction.error));
      transaction.onabort = () => reject(failure || storageError(transaction.error));
    });
  }

  async function remove(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(id);
      } catch (error) { reject(storageError(error)); return; }
      transaction.oncomplete = () => { window.dispatchEvent(new Event('dyson-artworks-changed')); resolve(); };
      transaction.onerror = () => reject(storageError(transaction.error));
      transaction.onabort = () => reject(storageError(transaction.error));
    });
  }

  window.DysonArtworks = Object.freeze({ list, save, remove });
})();
