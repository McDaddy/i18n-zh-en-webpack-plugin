const translate = require('translate');

translate.key = 'YOUR-KEY-HERE';
translate.engine = 'libre';

translate('你叫什么名字？', { from: 'zh', to: 'en', engine: 'google' })
  .then((res) => {
    console.log('结果', res);
  })
  .catch((err) => {
    console.error(err);
  });
// const axios = require('axios');

// const getTranslate = async () => {
//   const res = await axios.post('https://libretranslate.com/translate', {
//     q: '你妹的',
//     source: 'zh',
//     target: 'en',
//   });
//   console.log(res.data);
//   return res;
// };
// getTranslate();
