const path = require('path')
process.chdir(__dirname)

process.env.NODE_ENV = 'production'
process.env.PORT = process.env.PORT || 3000
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

require('./server.js')
