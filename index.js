const _ = require("lodash")
const lineByLine = require('n-readlines')
const { SplitIntoParts, getRandom } = require("./service")

const liner = new lineByLine('./res/test_input.txt');
var currentLine;
var randomFrames = []

var memory, instructionRegister, instructionCounter, register, cToggle, pageTableRegister, pcb, ptr, totalTimeCounter, lineLimitCounter, errorMessage, SI, PI, TI

const init = function(){
    memory = _.fill(Array(300),_.fill(Array(4),null))
    instructionRegister = _.fill(Array(4), null)
    instructionCounter = null
    register = _.fill(Array(4), null)
    cToggle = false
    pageTableRegister = _.fill(Array(4), null)
    pcb = {
        jobId: null,
        totalTimeLimit: null,
        totalLineLimit: null
    }
    totalTimeCounter = null
    lineLimitCounter = null
    errorMessage = [
        "No Error",
        "Out of Data",
        "Line Limit Exceeded",
        "Time Limit Exceeded",
        "Operation Code Error",
        "Operand Error",
        "Invalid Page Fault"
    ]
    ptr = null

    SI = 3
    TI = 0
    PI = null
}

const displayMemory = function(){
    memory.map(function(row, index) {
        console.log(index, row)
    })
}

const allocate = function(){
    let randomNumber = getRandom(0,29)
    console.log(randomNumber)
    if(randomFrames.length > 29){
        return -1
    }else if (randomFrames.includes(randomNumber)) {
        randomNumber = allocate()
    } else {
        randomFrames.push(randomNumber)
        return randomNumber
    }
    return randomNumber
}

const initPCB = function(){
    const frame = allocate()
    console.log("frame",frame)
    if (frame === -1) {
        console.log("Memory Full")
        return
    }
    console.log(frame*10,(frame*10)+9)
    ptr = frame*10
    for (let i = frame*10; i <= (frame*10)+9; i++) {
        memory[i] = [0, '', '*', '*']
    }
    
}

const storeProgramCards = function(){
    currentLine = liner.next().toString('ascii')
    currentLine = currentLine.trim()
    let flag = true;
    let programCards = []

    while(flag){
        if (currentLine.charAt(currentLine.length-1) == "H") {
            currentLine = currentLine.slice(0, currentLine.length - 1)
            let bufferProgramCard = currentLine.SplitIntoParts(4)
            bufferProgramCard.push("H")
            programCards.push(bufferProgramCard)
            flag = false
        } else {
            let bufferProgramCard = currentLine.SplitIntoParts(4)
            programCards.push(bufferProgramCard)
            currentLine = liner.next().toString('ascii')
            currentLine = currentLine.trim()
        }
    }

    programCards.map(function(pc){
        const frame = allocate()
        let currPtr = ptr;
        for(let i=ptr; i<ptr+10; i++){
            if(memory[i][0] === 0){
                currPtr = i
                break
            }
        }

        memory[currPtr][0] = 1
        memory[currPtr][2] = parseInt(frame/10)
        memory[currPtr][3] = frame%10
        ptr++
        console.log("frame",frame)
        if (frame === -1) {
            console.log("Memory Full")
            return
        }
        console.log(frame*10,(frame*10)+9)
        for (let i = frame*10,j=0; (i <= (frame*10)+9) || (j < pc.length); i++,j++) {
            if (pc[j-1] == "H" ) {
                break
            }
            memory[i] = pc[j].SplitIntoParts(1)
        }
    })
}


const load = function(){
    currentLine = liner.next().toString('ascii')
    const head = currentLine.slice(0,4)
    if (currentLine === false) {
        
    } else if (head === "$AMJ") {
        init()
        const buffer = currentLine.SplitIntoParts(4)
        pcb.jobId = buffer[1]
        pcb.totalTimeLimit = parseInt(buffer[2]) 
        pcb.totalLineLimit = parseInt(buffer[3])
        
        initPCB()
        console.log(pcb)
        
        storeProgramCards()
        displayMemory()
        load()
    }
}



load()


