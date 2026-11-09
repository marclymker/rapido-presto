'use strict';
const admin = require('firebase-admin');
admin.initializeApp();
Object.assign(exports, require('./chat'));
