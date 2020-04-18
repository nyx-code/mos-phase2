const _ = require("lodash")
const lineByLine = require('n-readlines')
const fs = require('fs');
const { SplitIntoParts, getRandom } = require("./service")

const outputFilePath = './res/test_output.txt'
const inputFilePath = './res/test_input.txt'
const liner = new lineByLine(inputFilePath);
var currentLine;
var randomFrames = []

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
    realAddress = null
    virtualAddress = null

    SI = 0
    TI = 0
    PI = 0
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

const addressMap = function(address){
    if (typeof address === "number") {
        const temp = address/10
        console.log(parseInt(ptr+temp))
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
    // displayMemory()
    let tempCounter = 0
    let charCounter = 0
    let tempCount = 0
    let word = []
    let address;
    console.log("Line",currentLine.length-1)
    while (charCounter < currentLine.length-1) {
        console.log("charCount", charCounter)
        console.log("address", realAddress+tempCount)
        address = realAddress+tempCount
        word.push(currentLine[charCounter])
        tempCounter++
        // console.log(memory[realAddress+tempCount][tempCounter])
        // tempCounter = (charCounter%4)
        if(charCounter != 0 && (tempCounter === 4 || charCounter === currentLine.length-2)){
            console.log(word)
            memory[address] = word
            word = []
            tempCounter=0
            tempCount++
        }
        charCounter++
    }

    if(memory[address][1] === undefined)
        memory[address][1] = null
    if(memory[address][2] === undefined)
        memory[address][2] = null
    if(memory[address][3] === undefined)
        memory[address][3] = null
    
    
}

const write = function(){
    //TODO: write contents of memory to the file
    // displayMemory()
    let lineToAppend = ""
    let wordCounter = 0
    let mainCounter = 0
    while(1){
        let address = realAddress + mainCounter
        console.log("Address",address)
        console.log(memory[address][wordCounter])
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

const mos = function() {
    console.log("PI TI SI", PI,TI,SI)
    if (TI === 0 && PI === 3) {
        //TODO: Handle Valid Page Fault
        console.log("Hello")
        if ((instructionRegister[0]+instructionRegister[1]) === ("GD" || "SR")) {
            const frame = allocate()
            console.log("IR", instructionRegister)
            console.log("PTR", ptr)
            memory[ptr+parseInt(instructionRegister[2])][0] = 1 
            memory[ptr+parseInt(instructionRegister[2])][2] = parseInt(frame/10)
            memory[ptr+parseInt(instructionRegister[2])][3] = frame%10

            instructionCounter--
            PI = 0
            TI = 0
            return
        }
    }else if (TI === 0 && SI === 1) {
        TI = 0
        SI = 0
        read()
        // displayMemory()

    } else if (TI === 0 && SI === 2){
        TI = 0
        SI = 0
        write()
    }
}

const simulation = function() {
    totalTimeCounter++
    if (totalTimeCounter = pcb.totalTimeLimit) {
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
        // displayMemory()
        console.log("realAddress",realAddress)
        console.log("instructionCounter", instructionCounter)
        console.log("memory[realAddress+(instructionCounter%10)]", memory[tempRA+(instructionCounter%10)])
        console.log("instructionRegister",instructionRegister)
        if (instructionRegister[0] !== "H") {
            virtualAddress = parseInt(instructionRegister[2]+instructionRegister[3])
            console.log("virtualAddress",virtualAddress)
            realAddress = addressMap(virtualAddress) !== undefined ? addressMap(virtualAddress) : realAddress
            if (PI !== 0) {
                flag = false
            }
        }
        
        if (flag) {
            const instruction = instructionRegister[0] + (instructionRegister[1] === null ? "": instructionRegister[1])

            switch (instruction) {
                case "LR":
                    exit()
                    register = memory[realAddress]
                    break
                case "SR":
                    exit()
                    memory[realAddress] = register
                    break
                case "CR":
                    exit()
                    if (JSON.stringify(memory[realAddress]) === JSON.stringify(register)) {
                        cToggle = true
                    }else {
                        cToggle = false
                    }
                    break
                case "BT":
                    exit()
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
                    exit(0)
                    break
                default:
                    exit()
                    // TODO: Raise Operation error interrupt
                    PI = 1
            }
        }

        // simulation()

        if ((SI !== 0) || (PI !== 0) || (TI !== 0)) {
            console.log("realAddress",realAddress)
           
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
    currentLine = liner.next().toString('ascii')
    const head = currentLine.slice(0,4)
    if (currentLine === false) {
        console.log("Program has finished its execution.")
        exit(0)
    } else if (head === "$AMJ") {
        init()
        const buffer = currentLine.SplitIntoParts(4)
        pcb.jobId = buffer[1]
        pcb.totalTimeLimit = parseInt(buffer[2]) 
        pcb.totalLineLimit = parseInt(buffer[3])
        
        initPCB()
        console.log(pcb)
        
        storeProgramCards()
        // displayMemory()
        load()
    } else if (head === "$DTA"){
        startExecution()
    }
}


fs.unlink(outputFilePath,(err) => {
    load()
})


