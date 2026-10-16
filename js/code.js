import codie from '/node_modules/@ape-egg/codie/codie.js';

import { grammar } from '/js/generator.js';

// The rules read straight from the generator's own slots, so the page never drifts from what it runs
export default () => Object.assign(codie(document.querySelector('codie')), { language: 'markdown', code: grammar });
