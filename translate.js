const fs = require('fs')
const readline = require('readline')
const path = require('path')

const reg = /(trans\(.*\))/gi
const dispose = /\/\//
const obj = {}
const separator = 'lang[' // 分隔符
const suffix = ['.js', '.jsx'] // 后缀白名单
// const ignore = ['./pages']
const entry = './src/pages' // 入口
const output = './src/lang/' // 输出路径
const outputFile = `${output}en.json`
let increment = process.argv[2] !== 'new' // 是否增量生成
console.log('-----start-----')
let readNum = 0

function readFileToObj(fReadName, value, callback) {
  var fRead = fs.createReadStream(fReadName)
  var objReadline = readline.createInterface({
    input: fRead,
  });

  objReadline.on('line', line => {
    // 注释的忽略
    if (line.includes('//') || line.includes('*')) {
      return
    }
    if (line) {
      const arr = line.split(separator)
      if (arr.length > 1) {
        const bb = arr.slice(1)
        for (let i in bb) {
          const v0 = bb[i].split(']')[0]
          const v = v0.substr(1, v0.length - 2)
          if (!v) {
            // 空输出提示
            console.warn(`空行为：${line}`)
            continue
          }
          // 增量就不覆盖了
          if (increment && value && value[v]) {
            obj[v] = value[v]
          } else {
            obj[v] = v
          }

        }
      }
    }
  })
  objReadline.on('close', () => {
    if (--readNum === 0) {
      let result = JSON.stringify(obj, null, 2)
      fs.writeFile(outputFile, result, err => {
        if (err) {
          console.warn(err)
        }
      })
      callback && callback()
    }
  })
}


const filePath = path.resolve(entry)

// 递归执行，直到判断是文件就执行readFileToObj
function fileDisplay(filePath, value, callback) {
  fs.readdir(filePath, (err, files) => {
    let count = 0
    function checkEnd() {
      if (++count === files.length && callback) {
        callback()
      }
    }
    if (err) {
      console.warn(err)
    } else {
      files.forEach(filename => {
        var fileDir = path.join(filePath, filename)
        fs.stat(fileDir, (err2, status) => {
          if (err2) {
            console.warn(err2)
          } else {
            if (status.isDirectory()) {
              return fileDisplay(fileDir, value, checkEnd)
            }
            else if (status.isFile()) {
              // 后缀不符合的跳过
              if (!suffix.includes(path.extname(fileDir))) {
                // return
              } else {
                readNum++
                readFileToObj(fileDir, value)
              }
            }
            checkEnd()
          }
        })
      })
    }
  })


}


// 开始逻辑
function run() {
  new Promise((resolve, reject) => {
    fs.exists(outputFile, exists => {
      // 存在且增量生成
      if (exists && increment) {
        console.log('增量更新')
        fs.readFile(outputFile, 'utf-8', (err, data) => {
          if (err) {
            console.warn(err)
          } else {
            try {
              // 旧文件已存在的json
              const json = JSON.parse(data)
              // console.log(json)
              resolve(json)
            } catch (e) {
              // 翻车
              console.warn(e)
              errDeal(resolve).then(res => {
                resolve()
              })
            }
          }
        })
      } else {
        console.log('全量更新')
        resolve()
      }
    })
  }).then(value => {
    let startTime = Date.now()
    fileDisplay(filePath, value, function (value) {
      console.log('finish:', Date.now() - startTime)
    })
  })


}

// 异常处理
function errDeal(resolve) {
  const tips = '出现异常情况1.重新全量生成2.放弃\n'
  return new Promise(resolve2 => {
    const r1 = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    r1.question(tips, (answer) => {
      r1.close()
      if (answer == 1) {
        console.log('重新')
        resolve2(resolve)
        // process.exit()
      } else if (answer == 2) {
        console.log('放弃')
        process.exit()
      } else {
        // resolve()
        errDeal(resolve)
      }
    })
  }).then(r => {
    return resolve
  })
}


run()
