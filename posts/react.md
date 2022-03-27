---
title: 'How to Build a Mini React: From JSX Element to useState'
excerpt: '"What I cannot create, I do not understand." - Richard Feynman'
coverImage: '/assets/blog/react/cover.jpg'
date: '2022-03-27'
---

## Fiber

To understand what a fiber is, first we need to know about JSX elements. A JSX element is just a plain object, in which there is a `type` property and a `props` property. Here is an example:

```js
const element = {
  type: 'h1',
  props: {
    children: 'Hello World',
  },
}
```

The `type` property shows what kind of HTML element this object stands for, and the props show its properties, including children, if that element can have children.

And to create a JSX element for an `h1` element, if we were to follow the api in React, we'll need to call `createElement` like this:

```js
const element = createElement('h1', null, 'Hello World')
```

To do that, we also need a `createElement` method. Let's write it out:

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

// const element = {
//   type: 'h1',
//   props: {
//     children: [
//       {
//         type: 'TEXT_ELEMENT',
//         props: {nodeValue: 'Hello World', children: []},
//       },
//     ],
//   },
// }
const element = createElement('h1', null, 'Hello World')
```

So what about fibers? Well, a fiber is the "extension" of JSX element and it has more properties on it, which looks like this:

```js
const fiber = {
  // these two are the same as those in JSX elements
  type: 'h1',
  props: {children: 'Hello World'},
  // the actual dom node the current fiber represents
  dom: domNode,
  // the current fiber's parent, first child and first sibling in the fiber tree
  parent: parentFiber,
  child: childFiber,
  sibling: null,
  // a alternative, work-in-progress version of the current fiber
  alternative: currentFiber,
  // any additional work associated during reconciliation
  effectTag: PLACEMENT,
  // any hooks that need to be run
  hooks: [],
}
```

Say we are going to create a fiber for the root container dom node, it will look like this:

```js
let wipRoot = null
const container = document.getElementById('root')
wipRoot = {
  type: 'n/a', // special type of root fiber, normally a string or function
  dom: container, // container root node
  props: {
    children: [element], // the JSX element we just created, not fiber, yet.
  },
  // links to others
  // alternative // pending fiber
  // child // first child
  // parent
  // sibling // first sibling
}
```

And if we want to render the element onto the container node, the `render` function may look like this:

```js
function render(element, container) {
  // create dom node
  const dom =
    element.type === 'TEXT_ELEMENT'
      ? document.createTextNode()
      : document.createElement(element.type)

  // check and add properties
  const isProperty = (key) => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => (dom[name] = element.props[name]))

  // recursively render children
  element.props.children.forEach((child) => render(child, dom))

  // mount
  container.appendChild(dom)
}
```

## Reconciliation & Commit

As you can see, this rendering approach is top-to-bottom, recursive, all synchronous and will block the main execution thread. That means, during this kind of rendering process of React, if an user were to type something in an input field, or the browser were to render some animation, they will get jammed by React, which is horrible in perspective of performance and user experience. And that's why the React team came up with a better approach to React rendering, reconciliation and commit.

So the basic idea of reconciliation and commit is that React will split the whole rendering process into two parts. The first part, reconciliation, is the comparing process in which React calculate what's different between user interactions, and the second part, commit, is when React mount the calculation result of reconciliation onto the actual DOM. And to not blocking any necessary operations by the user and the browser, React will chop the whole reconciliation process into minimal units of work, which allows browser to ask React to pause the calculation and wait until the necessary user interactions or animation has been done and carry on. And those minimal units of work is represented by the fiber data structure. But why it won't chop the commit phase into work of units? That's because the mounting must not be paused, otherwise the data could be changed, which could sabotage the consistency between the data and the UI it populates.

The work loop for reconciliation is a depth-first iteration over the fiber tree. Starting from the `wipRoot` fiber, first traverse to the parent, then the first child, and if the child has its own child, go to that child. And if that child of the child, aka the grandchild of the parent has no children, and last it's the first sibling of the grandchild and the sibling's child. After all the reconciliation at the bottom is finished, we go all the way back up to the `wipRoot` fiber. The big O of this traverse is O(n) because this approach basically treats the tree like a list and traverse the nodes one by one.

Here is how the reconciliation and commit code looks like in concept:

```js
let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = []
let wipFiber = null
let hookIndex = null

nextUnitOfWork = wipRoot
while (nextUnitOfWork) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
}
commitWork(wipRoot.child)

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function

  // if the fiber is a function component, call it
  if (isFunctionComponent) {
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children.flat())
  } else {
    // otherwise just create a dom node for it
    if (!fiber.dom) fiber.dom = createDom(fiber)
    reconcileChildren(fiber, fiber.props.children.flat())
  }

  if (fiber.child) return fiber.child
  let nextFiber = fiber

  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}

function commitWork(fiber) {
  if (!fiber) return

  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternative.props, fiber.props)
  } else if (fiber.effectTag === 'DELETE') {
    commitDeletion(fiber, domParent)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

export function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null
    const sameType =
      oldFiber && element && element.type == oldFiber.type
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      // deletions.push(oldFiber)
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
    index++
  }
}

export function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)
  return dom
}

export function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}
export function updateDom(dom, prevProps, nextProps) {
  const isGone = (prev, next) => (key) => !(key in next)
  const isNew = (prev, next) => (key) => prev[key] !== next[key]
  const isEvent = (key) => key.startsWith('on')
  const isProperty = (key) => key !== 'children' && !isEvent(key)
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      (key) => !(key in nextProps) || isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = ''
    })
  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name]
    })
  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}
```

In the real-world implementation of React, instead of just using a while loop, they use web APIs such as `requestIdleCallback` and `requestAnimationFrame` to keep the work loop running and pause when necessary.

```js
// nextUnitOfWork = wipRoot
// while (nextUnitOfWork) {
//   nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
// }
// commitWork(wipRoot.child)

function workLoop(deadline) {
  // reconciliation
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    // let browser pause it based on how much time is left
    shouldYield = deadline.timeRemaining() < 1
  }
  // commit
  if (!nextUnitOfWork && wipRoot) {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)
```

This will kickoff the render process, but we as React users don't usually write `requestIdleCallback` to render our apps. So let's write a proper `render` method.

```js
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {children: [element]},
    alternative: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
render(element, container)
```

In the new concurrent mode implementation, a new API called `createRoot` was introduced, which looks like this:

```js
function createRoot(container) {
  return {
    render(element) {
      wipRoot = {
        dom: container,
        props: {children: [element]},
        alternative: currentRoot,
      }
      deletions = []
      nextUnitOfWork = wipRoot
    },
  }
}
createRoot(container).render(element)
```

This makes it easier to render components when you have multiple roots.

## useState

And here is what `useState` will look like in concepts.

```js
function useState(initialState) {
  const oldHook = wipFiber?.alternative?.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initialState,
    pendingState: '__NONE__',
  }
  if (oldHook && oldHook.pendingState !== '__NONE__') {
    hook.state = oldHook.pendingState
  }

  // for now only takes functions
  const setState = (setStateCallback) => {
    hook.pendingState = setStateCallback
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternative: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}
```

It pulls out the `pendingState`, if any, from the old hook and render it, and also push the current state into the pending queue in the `setState`, clones the `currentRoot` fiber into the `wipRoot` and queues it to be the `nextUnitOfWork`. So the order these hooks are called here is important. You don't want to call a hook within a loop, an if statement or a callback to mess everything up.
