import { loadEnv } from 'vite'
const env = loadEnv('mock', process.cwd(), 'VITE')
console.log('cwd:', process.cwd())
console.log('env:', env)
