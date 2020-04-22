const _ = require("lodash")
const lineByLine = require('n-readlines')
const fs = require('fs');
const { SplitIntoParts, getRandom } = require("./service")

const outputFilePath = './res/test_output.txt'
const inputFilePath = './res/test_input.txt'
const liner = new lineByLine(inputFilePath);
var currentLine;
var randomFrames = []
var mainFlag = false 
var mainFlag1 = false 
var memory,realAddress, virtualAddress, instructionRegister, instructionCounter, register, cToggle, pageTableRegister, pcb, ptr, totalTimeCounter, lineLimitCounter, errorMessage, SI, PI, TI

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
    totalTimeCounter = 0
    lineLimitCounter = 0
    errorMessage = [
        "NO ERROR",
        "OUT OF DATA",
        "LINE LIMIT EXCEEDED",
        "TIME LIMIT EXCEEDED",
        "OPERATION CODE ERROR",
        "OPERAND ERROR",
        "INVALID PAGE FAULT"
    ]
    ptr = null
    realAddress = null
    virtualAddress = null
    mainFlag = false 
    mainFlag1 = false 
    SI = 0
    TI = 0
    PI = 0
    randomFrames = []
}

const displayMemory = function(){
    memory.map(function(row, index) {
        console.log(index, row)
    })
}

const allocate = function(){
    let randomNumber = getRandom(0,29)
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
    if (frame === -1) {
        return
    }
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

        if (frame === -1) {
            return
        }
        
        for (let i = frame*10,j=0; (i <= (frame*10)+9) || (j < pc.length); i++,j++) {
            if (pc[j-1] == "H" ) {
                break
            }
            memory[i] = pc[j].SplitIntoParts(1)
        }
    })
}

const addressMap = function(address){
    if (typeof address === "number") {
        const temp = address/10
        if(memory[parseInt(ptr+temp)][2]+memory[parseInt(ptr+temp)][3] === "**"){
            //TODO: Raise Page Fault interrupt
            PI = 3
        } else {
            const frame = memory[parseInt(ptr+temp)][2]*10 + memory[parseInt(ptr+temp)][3]
            
            return frame*10 + address%10
        }
    } else {
        //TODO: Raise Operand Error interrupt
        PI = 2
    }
    return
}

const read = function(){
    currentLine = liner.next().toString('ascii')
    let head = currentLine.slice(0,4)
    if (head === "$END") {
        mainFlag1 = true
        terminate(1)
    }
    let tempCounter = 0
    let charCounter = 0
    let tempCount = 0
    let word = []
    let address;
    while (charCounter < currentLine.length-1) {
      
        address = realAddress+tempCount
        word.push(currentLine[charCounter])
        tempCounter++
        if(charCounter != 0 && (tempCounter === 4 || charCounter === currentLine.length-2)){
            memory[address] = word
            word = []
            tempCounter=0
            tempCount++
        }
        charCounter++
    }

    if(memory[address][1] === undefined)
        memory[address][1] = ''
    if(memory[address][2] === undefined)
        memory[address][2] = ''
    if(memory[address][3] === undefined)
        memory[address][3] = ''
}

const write = function(){
    //TODO: write contents of memory to the file
    lineLimitCounter++
    if (lineLimitCounter > pcb.totalLineLimit) {
        terminate(2)
    }

    let lineToAppend = ""
    let wordCounter = 0
    let mainCounter = 0
    while(1){
        let address = realAddress + mainCounter
        if (memory[address][wordCounter] === null) {
            lineToAppend += "\n"
            break
        }

        lineToAppend += memory[address][wordCounter]
        wordCounter++

        if (wordCounter === 4) {
            wordCounter = 0
            mainCounter++
        }

    }
    fs.appendFileSync(outputFilePath, `${lineToAppend}`, (err) => {
        if (err)
            console.log('ERROR:', err);
    });
    
}

const terminate = function(error1, error2){

    mainFlag = true

    let errorMsg = errorMessage[error1]
    if(error2){
        errorMsg += ` AND ${errorMessage[error2]}`
    }

    let lineToAppend = `JOB ID : ${pcb.jobId}\n${errorMsg}\nIC     : ${instructionCounter}\nIR     : ${instructionRegister.join('')}\nTTC    : ${totalTimeCounter}\nLLC    : ${lineLimitCounter}\n`

    fs.appendFileSync(outputFilePath, `${lineToAppend}\n\n`, (err) => {
        if (err)
            console.log('ERROR:', err);
    });
    load()
}

const mos = function() {
    if (TI === 0 && SI === 1) {
        TI = 0
        SI = 0
        read()
    } else if (TI === 0 && SI === 2){
        TI = 0
        SI = 0
        write()
    } else if (TI === 0 && SI === 3){
        TI = 0
        SI = 0
        terminate(0)
    } else if (TI === 2 && SI === 3){
        TI = 0
        SI = 0
        terminate(0)
    } else if (TI === 2 && SI === 1){
        TI = 0
        SI = 0
        terminate(3)
    } else if (TI === 2 && SI === 2){
        TI = 0
        SI = 0
        write()
        terminate(3)
    } else if (TI === 0 && PI === 1){
        TI = 0
        PI = 0
        terminate(4)
    } else if (TI === 0 && PI === 2){
        TI = 0
        PI = 0
        terminate(5)
    } else if (TI === 0 && PI === 3) {
        //TODO: Handle Valid Page Fault
        if ((instructionRegister[0]+instructionRegister[1]) === "GD" || (instructionRegister[0]+instructionRegister[1]) === "SR") {
            const frame = allocate()
            memory[ptr+parseInt(instructionRegister[2])][0] = 1 
            memory[ptr+parseInt(instructionRegister[2])][2] = parseInt(frame/10)
            memory[ptr+parseInt(instructionRegister[2])][3] = frame%10
            instructionCounter--
            PI = 0
            TI = 0
            return
        } else {
            terminate(6)
        }
    }else if (TI === 2 && PI === 1){
        TI = 0
        PI = 0
        terminate(3,4)
    } else if (TI === 2 && PI === 2){
        TI = 0
        PI = 0
        terminate(3,5)
    } else if (TI === 2 && PI === 3){
        TI = 0
        PI = 0
        terminate(3)
    }
}

const simulation = function() {
    totalTimeCounter++
    if (totalTimeCounter >= pcb.totalTimeLimit) {
        TI = 2
    }
}

const executeUserProgram = function(){
    realAddress = addressMap(instructionCounter)

    const tempIC = instructionCounter
    const tempRA = realAddress
    while(tempIC+10 !== instructionCounter){
        let flag = true
        instructionRegister = memory[tempRA+(instructionCounter%10)]
        instructionCounter++
        if (instructionRegister[0] !== "H") {
            if (isNaN(parseInt(instructionRegister[2])) ||  isNaN(parseInt(instructionRegister[3]))) {   
                virtualAddress = instructionRegister[2]+instructionRegister[3]
            } else {
                virtualAddress = parseInt(instructionRegister[2]+instructionRegister[3])
            }
            realAddress = addressMap(virtualAddress) !== undefined ? addressMap(virtualAddress) : realAddress
            if (PI !== 0) {
                flag = false
            }
        }
        
        if (flag) {
            const instruction = instructionRegister[0] + (instructionRegister[1] === undefined ? "": instructionRegister[1])

            switch (instruction) {
                case "LR":
                    register = memory[realAddress]
                    break
                case "SR":
                    memory[realAddress] = register
                    break
                case "CR":
                    if (JSON.stringify(memory[realAddress]) === JSON.stringify(register)) {
                        cToggle = true
                    }else {
                        cToggle = false
                    }
                    break
                case "BT":
                    if (cToggle) {
                        instructionCounter = parseInt(instructionRegister[2]+instructionRegister[3])
                    }
                    break
                case "GD":
                    SI = 1
                    break
                case "PD":
                    SI = 2
                    break
                case "H":
                    SI = 3
                    break
                default:
                    // TODO: Raise Operation error interrupt
                    PI = 1
            }

            if (PI !== 1) { 
                simulation()
            }
        }


        if ((SI !== 0) || (PI !== 0) || (TI !== 0)) {
            mos()
        }
    }

    executeUserProgram()
    
}

const startExecution = function(){
    instructionCounter = 0;
    executeUserProgram()
} 


const load = function(){
    let head
    if (!mainFlag1) {
        currentLine = liner.next().toString('ascii')
        head = currentLine.slice(0,4)

        if (mainFlag) {
            mainFlag = false
            while(1){
                currentLine = liner.next().toString('ascii')
                head = currentLine.slice(0,4)
                if (head === "$AMJ" || currentLine === "false") {
                    break
                }
            }
        }
    } else{
        mainFlag1 = false
        head = currentLine.slice(0,4)
    }

    if (currentLine === "false") {
        console.log("Program has finished its execution.")
        process.exit(-1)
    } else if (head === "$AMJ") {
        init()
        const buffer = currentLine.SplitIntoParts(4)
        pcb.jobId = buffer[1]
        pcb.totalTimeLimit = parseInt(buffer[2]) 
        pcb.totalLineLimit = parseInt(buffer[3])
        
        initPCB()
        
        storeProgramCards()
        load()
    } else if (head === "$DTA"){
        startExecution()
    } else if (head === "$END"){
        load()
    }
}


fs.unlink(outputFilePath,(err) => {
    load()
})


