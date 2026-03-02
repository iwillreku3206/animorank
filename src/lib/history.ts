import { browser } from '$app/environment'


//this function gets the history on localstorage gets all the changes previously done by the user
export const restoreHistory = (problem: string, value: string) => {
  if (browser) {
    const history: string[] = JSON.parse(localStorage.getItem(problem) || '[]')
    let newVal = value

    if (history.length == 0) {
      return value
    }

    history.forEach((element: string) => {
      const change = JSON.parse(element)
      const index = change[2]
      const char = change[1]
      let left = newVal.slice(0, index)
      let right = newVal.slice(index + change[0])
      newVal = left + char + right

    })

    return newVal
  }
  return value
}


//this function updates history
export const updateHistory = (problem: string, newVal: string) => {
  if (browser) {
    const history = JSON.parse(localStorage.getItem(problem) || '[]')
    history.push(newVal)
    localStorage.setItem(problem, JSON.stringify(history))
  }
}

export const clearHistory = (problem: string) => {
  if (browser) {
    const history: [] = []
    localStorage.setItem(problem, JSON.stringify(history))
  }
}
