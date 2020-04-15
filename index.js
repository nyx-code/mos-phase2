const _ = require("lodash")
const lineByLine = require('n-readlines')
const { SplitIntoParts, getRandom } = require("./service")

const liner = new lineByLine('./res/test_input.txt');
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
        if(memory[ptr][2]+memory[ptr][3] === "**"){
            //TODO: Raise Page Fault interrupt
        } else {
            const frame = memory[ptr][2]*10 + memory[ptr][3]
            
            return frame*10 + address%10
        }
    } else {
        //TODO: Raise Operand Error interrupt
    }
}

const executeUserProgram = function(){
    realAddress = addressMap(instructionCounter)

    while(instructionCounter+10 !== instructionCounter){
        instructionRegister = memory[realAddress]
        instructionCounter++

        if (instructionRegister[2] !== null || instructionRegister[3] !== null) {
            virtualAddress = (parseInt(instructionRegister[2]) == NaN ? instructionRegister[2] : parseInt(instructionRegister[2])*10) + (parseInt(instructionRegister[3]) == NaN ? instructionRegister[3] : parseInt(instructionRegister[3])%10)
            realAddress = addressMap(virtualAddress)
        }
       
        const instruction = instructionRegister[0] + (instructionRegister[1] === null ? "": instructionRegister[1])

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
                break
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



load()


