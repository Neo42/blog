---
title: 'How to Build a Mini React (wip 🚧)'
excerpt: 'Create your own version of a thing is THE way to understand it. So I decided to rewrite a simple version of React from scratch. I''m going to call the little library "Reacti" since it is just my personal little "recreation" of that mighty tool, and that name sounds natural to me.'
coverImage: '/assets/blog/react/cover.jpg'
date: '2021-06-30'
author:
  name: Hao Jiang
  picture: '/assets/blog/authors/hao.png'
ogImage:
  url: '/assets/blog/react/cover.jpg'
---

Create your own version of a thing is THE way to understand it. So I decided to rewrite a simple version of React from scratch. I'm going to call the little library "Reacti" since it is just my personal little "reinvention" of that mighty tool, and that name sounds natural to me.

Along the way, we are going to rewrite these key features, step by step:

## `createElement`

```js
const element = <h1 title="foo">Hello</h1>
const container =
  document.getElementById('root')
ReactDOM.render(element, container)
```

Let's first do a quick review of how we write code in React. In the code above, we created an React `element` containing an `<h1>` tag with a `title` prop with the value `"foo"` and a text element `Hello` in it. `ReactDOM` gets the `#root` element in the DOM tree, grabs the React `element` we created, and renders it to the `#root` element.

This is how we create and render a React element. And it's most likely how you write code in React every day. But how do browsers understand JSX? The answer is that they can't. They can only understand HTML, CSS, and JavaScript. We have to transform it for them so that they can understand and execute it. How can we achieve that? This is where Babel comes in. Babel will simply turn the JSX above into the JavaScript code below:

```js
const element = React.createElement(
  'h1',
  {title: 'foo'},
  'Hello'
)
```

As you can see, JSX is essentially JavaScript function calls. [`React.createElement`](https://github.com/facebook/react/blob/0e100ed00fb52cfd107db1d1081ef18fe4b9167f/packages/react/src/ReactElement.js#L349) takes three arguments (or more):

```js
React.createElement(
  type,
  [props],
  [...children]
)
```

Optionally, with React, you can also pass `children` one by one, or as an array. Like this:

```js
// This works
const element = React.createElement(
  'h1',
  {title: 'foo'},
  ['Hello', 'World']
)

// This also works
const element = React.createElement(
  'h1',
  {title: 'foo'},
  'Hello',
  'World'
)
```

And, both way, it will return an React element object that looks like this:

```js
const element = {
  type: 'h1',
  props: {
    title: 'foo',
    children: 'Hello',
  },
}
```

So how can we recreate the `createElement` method? Well, easy. We can do it like this:

```js
function createElement(
  type,
  props,
  ...children
) {
  return {
    type,
    props: {
      ...props,
      children,
      key,
    },
  }
}

const Reacti = {createElement}
```

Notice that you can also pass a `key` as a prop while creating a React element to identify which items have changed, are added, or are removed. So now we can use our `createElement` like this:

```js
Reacti.createElement('div')
// Result: {type: "div", props: {children: []}}
```

or this:

```js
Reacti.createElement(
  'div',
  null,
  Reacti.createElement('div'),
  Reacti.createElement('div')
)

/* Result:
{
  type: 'div',
    props: {
      children: [
        {type: 'div', props: {children: []}},
        {type: 'div', props: {children: []}}
      ]
    }
}
*/
```

As we demonstrated in the beginning, `children` could also be primitive values such as strings and numbers. In this case, we can just create an React element containing only the child as the text content and no children. We will do a type check for each element in the `children` array.

```js
function createElement(
  type,
  props,
  ...children
) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object'
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return createElement('TEXT_ELEMENT', {
    nodeValue: text,
  })
}

const Reacti = {
  createElement,
  createTextElement,
}

Reacti.createElement(
  'div',
  null,
  'Hello',
  Reacti.createElement('div')
)

/* Result:
{
  type: 'div',
  props: {
    children: [
      {
        type: 'TEXT_ELEMENT',
        props: {nodeValue: 'Hello', children: []}
      },
      {type: 'div', props: {children: []}}
    ]
  }
}
*/
```

And now we can use our `createElement` however we want. But only with plain JavaScript Objects. We still want to use JSX. How do we tell Babel to use Reacti's `createElement` instead of React's?

Luckily, Babel does provide us with a way to work around this. Pretty simple. You just add a comment like this, and Babel will transform the JSX below with the specified function we created.

```js
function createElement(
  type,
  props,
  ...children
) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object'
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return createElement('TEXT_ELEMENT', {
    nodeValue: text,
  })
}

const Reacti = {
  createElement,
  createTextElement,
}

/** @jsx Reacti.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
)

/* Result:
{
  type: 'div',
  props: {
    id: 'foo',
    children: [
      {
        type: 'a',
        props: {
          children: [
            {
              type: 'TEXT_ELEMENT',
              props: {nodeValue: 'bar', children: [] }
            }
          ]
        }
      },
      {type: 'b', props: {children: []}}
    ]
  }
}
*/
```

And that's our `createElement` figured out. Nice work! I have to admit that Babel does a lot of heavy lifting for us. Nevertheless, we managed to take our first step towards the goal.

## `Render`

Next up, we need a way to render our element object onto the DOM tree. We need to take all the properties out of that returned object, assign the properties to the right DOM API, so that the corresponding DOM nodes get created. We will first scaffold the [`render`](https://github.com/facebook/react/blob/29faeb2df30347dc260fe4681d4526876c351db1/packages/react-dom/src/client/ReactDOMLegacy.js#L286) function.

```js
// ... function createElement ...

function render(element, container) {
  const {type, props} = element
  // TODO create dom nodes
}

const Reacti = {
  createElement,
  createTextElement,
  render,
}

// const element ...
// const container ...

Reacti.render(element, container)
```

We can create DOM nodes using `document.createElement` or `document.createTextNode`. So why not we just do that?

```js
function render({type, props}, container) {
  const dom =
    type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(type)
}
```

We check whether the element's type is `"TEXT_ELEMENT"`. If so, we will create a text node for it, or we will do an element. This way we can create DOM nodes based on the element type passed into `render`.

Next, we need to handle all the props on the element object. But because that the `props` could contain the `children` array, we need to be careful not to treat `children` as a regular prop. We'll do a check for each key on the `props` object. If the key is not `children`, we just assign the prop value to the DOM node:

```js
function render({type, props}, container) {
  // const dom = ...

  const notChildren = (key) =>
    key !== 'children'
  Object.keys(props)
    .filter(notChildren)
    .forEach(
      (name) => (dom[name] = props[name])
    )
}
```

For `children`, we can create a DOM node for each of them by simply `render`ing them onto the parent node, namely the current DOM node. And finally, we can append the current DOM node to the provided `container`.

```js
function render({type, props}, container) {
  // const dom = ...

  // const notChildren ...
  // Object.keys(props) ...

  props.children.forEach((child) =>
    render(child, dom)
  )
  container.appendChild(dom)
}
```

And that'll do for our `render` method. So far so good. And to put everything together, here is what we got so far:

### Incremental Rendering

So far our `render` function does work, but there is a disturbing problem: we can't interrupt the rendering process. As you know, JavaScript is single-threaded, and our `render` is completely synchronous and, therefore, blocking.

For example, say we have a huge element tree that takes five minutes to render. And during that five minutes, we have to click a button to load some data, but we just can't since the `render` function is still running, blocking the main thread, not allowing the browser to handle any high-priority works like user inputs and animation optimizations. So how do we solve this problem?

To follow the wording convention of the React team, now we define some key terms here.

- **Work**: any computations that must be performed. The rendering process as a whole is work. It can also be, and is usually, the result of an update (e.g. setState).
- **Scheduling**: the process of deciding when work should be performed.

To work around the blocking render issue, the React team come up with the idea of **incremental rendering**: splitting a big rendering work into small chunks, namely units of work, and execute them only when the browser is doing nothing. This is achieved by implementing a [`workLoop`](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/ReactFiberWorkLoop.new.js#L1558) initially based on [`requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback). This method takes a callback function as the argument, and the callback function only receives a special [`IdleDeadline`](https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline) object, passed by the browser, as the argument, and can be used to figure out how much time the browser has until it begins to carry out the upcoming time-consuming task.

The `wookLoop` will feed these units of work to a function called [`performUnitOfWork`](https://github.com/facebook/react/blob/f765f022534958bcf49120bf23bc1aa665e8f651/packages/react-reconciler/src/ReactFiberScheduler.js#L1140) to be executed one by one. If the main thread shouldn't be yielded by React to the browser and there are still units of work to be executed, the following unit will be executed. After that, React will check if it should yield the main thread to the browser by checking how much time the browser has to stay idle. If the deadline is coming, React will yield the thread to the browser and let it do its job. Once the browser is done, it will run the whole loop again. And that loop is called `workLoop`. We are going to create our own version of it.

So in code, the whole `workLoop` looks like this:

```js
let nextUnitOfWork = null

function workLoop(deadline) {
  // the browser is idle by default shouldn't yield
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )

    // check if the deadline is coming
    // if so, yield the thread to the browser
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(nextUnitOfWork) {
  // TODO
}
```

**2021 update**: As of April 2021, the React team has rewritten the scheduler package. They ditched `requestIdleCallback` and `requestAnimationFrame` but have implemented a [`schedulePerformWorkUntilDeadline`](https://github.com/facebook/react/blob/0e100ed00fb52cfd107db1d1081ef18fe4b9167f/packages/scheduler/src/forks/SchedulerDOM.js#L554-L577) instead of using [`setImmediate`](https://developer.mozilla.org/en-US/docs/Web/API/Window/setImmediate) (for Node and old IEs) and [`MessageChannel`](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel) to trigger the performance of units of work. Among the two, `setImmediate` is preferred by React because unlike `MessageChannel`, it doesn't stop node processes. And similar to the old `workLoop`, a [`performWorkUntilDeadline`](https://github.com/facebook/react/blob/0e100ed00fb52cfd107db1d1081ef18fe4b9167f/packages/scheduler/src/forks/SchedulerDOM.js#L518-L552) is used to perform work. Although there have been a few implementation changes, the new scheduler is still conceptually the same as our `workLoop` here.

## Fibers

When it comes to Fiber with a capitalized "F", people usually think of it as an algorithm or an architecture that powers the React core. But the Fiber algorithm also uses a data structure called fiber to manage all its work during the `workLoop` that we just talked about. But how exactly do fibers work? What is it on earth? To quote the word from Andrew Clark, _"A fiber is just a plain object that holds information about a component, its input and its output."_ And in fact, a fiber is a data structure that is a superset of the element object we've been talking about. You can take a peek into what a fiber node is [here](https://github.com/facebook/react/blob/e9a4a44aae675e1b164cf2ae509e438c324d424a/packages/react-reconciler/src/ReactFiber.new.js#L113).

As you can see in the source code, a fiber is just an object that contains quite a few properties. However, since we are creating a simplified clone of React, we don't have to take care of all of them but a few. Since we are creating fibers for React elements, we'll need `type` and `props` of the current React element. We want to put the DOM node created based on the fiber in itself. And we need to link the current fiber to its immediate child, sibling, parent, and a copy of itself to help organize the work process we mentioned in the last section. And if there are any React hooks being used by that element, we will store them into an array on that fiber. There is also a `effectTag` we need to tell the fiber when to create, update some DOM nodes, or deleting them in place, which helps separate the rendering and committing stages. If we put all the things we care about in a plain object, it might look like this.

```js
const fiber = {
  type: 'h1',
  props: {children: 'Hello world'},
  dom: domNode,
  parent: parentFiber,
  child: childFiber,
  sibling: null,
  alternate: currentFiber,
  hooks: [],
  effectTag: PLACEMENT,
}
```

These are all we need from a fiber object for this post. But before using these things, we need to implement our `performUnitOfWork` function. For that, we need to figure out how fibers are used during the work process. Turns out the `workLoop` uses fibers with a tree structure. Each fiber node represents a React element, and also a unit of work. React will traverse the nodes one by one based on several prioritization principles. For example, say we want to render an element like this one:

```js
Reacti.render(
  <div>
    <h1>
      <p />
    </h1>
    <h2>
      <p />
      <a />
    </h2>
  </div>,
  container
)
```

Here is a diagram illustrating how React renders this element with fibers. _Click or tap on the diagram to see the dynamic of the process._

<figure>
<object data="/assets/blog/react/fiber.svg" type="image/svg+xml"></object>
<figcaption>How React Renders things with Fibers</figcaption>
</figure>

As you can see, when rendering a fiber tree, React will first look for the root fiber, and then its immediate child and then its sibling. If there are no more children or siblings to traverse through, it will go all the way back up through every parent fiber and complete the rendering. This way it's easy for React to locate the next unit of work.

Besides the traversing priority of the fiber algorithm, We need to create the root fiber and set it as the `nextUnitOfWork` in the `render` function to prepare the initial unit of work for `performUnitOfWork` in the `workLoop`. In `performUnitOfWork`. So here is what our new `render` method looks like this:

```js
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  }
}

let nextUnitOfWork = null
```

Since now we have added fibers to the equation, the old code in `render` should be extracted as a separated function for `performUnitOfWork`'s use later:

```js
function createDom({type, props}) {
  const dom =
    type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(type)

  const notChildren = (key) =>
    key !== 'children'
  Object.keys(props)
    .filter(notChildren)
    .forEach(
      (name) => (dom[name] = props[name])
    )

  return dom
}
```

And then, time to populate the `performUnitOfWork` function. First, we create a DOM node based on the current fiber and add it to the fiber itself and its parent:

```js
// Create and add dom node for current fiber
if (!fiber.dom) {
  fiber.dom = createDom(fiber)
}

if (fiber.parent) {
  fiber.parent.dom.appendChild(fiber.dom)
}
```

And then, we grab all its `children` and create a new fiber for each of them traversing through the `children` list. We set the first child fiber as the immediate child of the current fiber and link the rest of the `children` fibers together with a `prevSibling.sibling` pointer:

```js
// Create children fibers and link them together
const elements = fiber.props.children
let prevSibling = null

elements.forEach(({type, props}, index) => {
  const newFiber = {
    type,
    props,
    parent: fiber,
    dom: null,
  }
  if (index === 0) {
    fiber.child = newFiber
  } else {
    prevSibling.sibling = newFiber
  }
  prevSibling = newFiber
})
```

And finally, we want to return the next unit of work. First the child, and the sibling, and finally the parent.

```js
// Search for nextFiber
// traversing through child, sibling & parent
let nextFiber = fiber
while (nextFiber) {
  if (nextFiber.sibling) {
    return nextFiber.sibling
  }
  nextFiber = nextFiber.parent
}
```

To put all the code from this section together, this is our `performUnitOfWork`:

```js
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }
  const elements = fiber.props.children
  let prevSibling = null

  elements.forEach(({type, props}, index) => {
    const newFiber = {
      type,
      props,
      parent: fiber,
      dom: null,
    }
    if (index === 0) {
      fiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
  })

  if (fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}
```
