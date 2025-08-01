const axios = require('axios');

const checkBackend = (url, timeout = 1200) => {
  return new Promise((resolve, reject) => {
    let startTime = Date.now();

    const check = () => {
      let elapsedTime = Math.floor((Date.now() - startTime) / 1000);

      if (elapsedTime > timeout) {
        reject(new Error(`Timeout: Backend was not ready within ${timeout} seconds.`));
        return;
      }

      axios.get(url)
        .then((response) => {
          if (response.status === 200) {
            console.log('Backend is ready!');
            resolve();
          } else {
            retryCheck(elapsedTime);
          }
        })
        .catch((error) => {
          retryCheck(elapsedTime);
        });
    };

    const retryCheck = (elapsedTime) => {
      console.log(`Waiting for a medusajs backend to be available on ${url}... Elapsed time: ${elapsedTime} seconds`);
      setTimeout(check, 5000); // Wait 5 seconds before retrying
    };

    check();
  });
};

module.exports = {
  checkBackend
};