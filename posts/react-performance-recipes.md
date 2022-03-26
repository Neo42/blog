---
title: 'React Performance Recipes'
excerpt: 'Performance optimization can be daunting, but there are still more solutions than problems. In this post, I talked about how to tackle common performance issues when developing with React. Get a solution for every React performance problem you might encounter.'
coverImage: '/assets/blog/react-po/cover.jpg'
date: '2022-01-05'
---

## Problem: Unnecessary Callback Re-Initiation

<HikeWithNoPreview>

<StepHead>

```js
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count)

React.useEffect(() => {
  updateLocalStorage()
}, []) // what goes in that dependency list?
```

</StepHead>

When you're using a callback function within `useEffect`, it's hard to predict how callback function will be modified in the future. Only passing in certain variables from the callback to the deps list won't do. Because once the variables passed in gets removed, your dependencies won't work any more. But you still have to provide some values to the dependency list to sync `useEffect` with the callback change.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count)

React.useEffect(() => {
  updateLocalStorage()
}, [updateLocalStorage]) // <-- function as a dependency
```

</StepHead>

One way we can solve this is to include the entire callback function into the dependency list.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
// recreated in every render
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count)

React.useEffect(() => {
  updateLocalStorage()
}, [updateLocalStorage]) // changes in every render
```

</StepHead>

But doing this also introduces another problem -- because the callback function is defined in the component's function body, it will be re-initialized from scratch every time the component gets rendered, and since functions are compared through references, even if the code of a function isn't modified between renders, every time it gets re-initialized, it will be [different](focus://1:3,6) from "itself" in the last render of the component, which will trigger a infinite re-rendering loop that you definitely wouldn't like. And that difference is what some people call "referential inequality", which will also happen when you're working with objects and arrays, because these three types are structural types that are compared through references.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
// how to optimize this with useCallback?
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count)

React.useEffect(() => {
  updateLocalStorage()
}, [updateLocalStorage])
```

</StepHead>

### Solution: `React.useCallback`

`const memoizedCallback = React.useCallback(callback, dependencyList)`: **Memoizes a callback function, only re-initialized it when the dependencies change and avoids referential inequality.**

<StepHead>

```js
const updateLocalStorage = React.useCallback(
  () =>
    window.localStorage.setItem(
      'count',
      count
    ),
  [count] // <-- yup! That's a dependency list!
)

React.useEffect(() => {
  updateLocalStorage()
}, [updateLocalStorage])
```

</StepHead>

And now every time the component gets re-rendered, the `updateLocalStorage` callback will only re-initialized when the [`count`](focus://7) value changes, otherwise React will use the same copy of it.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
// a callback function
const callback = () => {}

// vs its memoized version
const memoizedCallback = React.useCallback(
  callback,
  [someValue]
)
```

</StepHead>

`useCallback` can be powerful if properly used, but it won't necessarily make a callback function better for performance. As you can see, it [causes extra memory allocation](focus://5,7,8) and the memoized one won't be garbage collected after the render, which is something you should be aware of. So remember to only `useCallback` when you have to.

<CodeSlot style={{zoom: 0.8}}/>

</HikeWithNoPreview>

## Problem: Unnecessary Expensive Calculation

<HikeWithNoPreview>

<StepHead>

```js
function MyComponent({x, y}) {
  return <div>Hello World</div>
}
```

</StepHead>

React comes with the concept of "rendering". When a component is being rendered by React, that means React is calling the component function (or the `render` method in the case of class components). This comes with an unfortunate limitation that calculations performed within the function (or `render`) will be performed every single render, regardless of whether the inputs for the calculations change. For example:

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
function MyComponent({x, y}) {
  const result = expensiveCalculation(x, y)
  return <div>The result is {result}.</div>
}
```

</StepHead>

Every time the parent component of `MyComponent` is re-rendered or some state is added later and setting the state triggers re-renders, so for `expensiveCalculation`, [it will be recalculated in every render](focus://2) of this component, which leads to performance bottlenecks.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
// how to optimize this with useMemo?
function MyComponent({x, y}) {
  const result = expensiveCalculation(x, y)
  return <div>The result is {result}.</div>
}
```

</StepHead>

### Solution: `React.useMemo`

`const memoizedResult = React.useMemo(calculationCallback, dependencyList)`: **Memoizes the result of the calculation and only calls the calculation when the dependencies changes.**

<StepHead>

```js
function MyComponent({x, y}) {
  const result = React.useMemo(
    () => expensiveCalculation(x, y),
    [x, y]
  )
  return <div>The result is {result}.</div>
}
```

</StepHead>

With [`useMemo`](focus://2:4), here is the optimized version of `MyComponent`. And now `result` will only be calculated again when `x` or `y` changes.

<CodeSlot style={{zoom: 0.8}}/>

</HikeWithNoPreview>

## So when should I `useMemo` and `useCallback`?

Use `useCallback` when you want to avoid unnecessary re-renders caused by **referential inequality** of structural data types, for example:

<HikeWithNoPreview>

<StepHead>

```js
function Foo({bar, baz}) {
  React.useEffect(() => {
    const options = {bar, baz}
    buzz(options)
  }, [bar, baz])
  return <div>foobar</div>
}

function Foo({bar, baz}) {
  React.useEffect(() => {
    const options = {bar, baz}
    buzz(options)
  }, [bar, baz])
  return <div>foobar</div>
}

function Blub() {
  const bar = React.useCallback(() => {}, [])
  const baz = React.useMemo(
    () => [1, 2, 3],
    []
  )
  return <Foo bar={bar} baz={baz} />
}
```

</StepHead>

When using [values](focus://18:21) as [dependencies](focus://2,5,10,13) in `useEffect`.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
const CountButton = React.memo(
  function CountButton({onClick, count}) {
    return (
      <button onClick={onClick}>
        {count}
      </button>
    )
  }
)

function DualCounter() {
  const [count1, setCount1] =
    React.useState(0)
  const increment1 = React.useCallback(
    () => setCount1((c) => c + 1),
    []
  )

  const [count2, setCount2] =
    React.useState(0)
  const increment2 = React.useCallback(
    () => setCount2((c) => c + 1),
    []
  )

  return (
    <>
      <CountButton
        count={count1}
        onClick={increment1}
      />
      <CountButton
        count={count2}
        onClick={increment2}
      />
    </>
  )
}
```

</StepHead>

When using [`React.memo`](focus://1,9) to avoid unnecessary child re-renders when you pass complex [callbacks](focus://14:17,21:24) as event handlers into child components. Because callback functions will be re-initialized every re-render.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
function RenderPrimes({
  iterations,
  multiplier,
}) {
  const primes = React.useMemo(
    () =>
      calculatePrimes(iterations, multiplier),
    [iterations, multiplier]
  )
  return <div>Primes! {primes}</div>
}
```

</StepHead>

Use `useMemo` when you want to avoid unnecessary computationally expensive [calculations](focus://5:9).

<CodeSlot style={{zoom: 0.8}}/>

</HikeWithNoPreview>

## Problem: Unnecessary Child Re-Renders

Besides function re-initiation and value recalculation, there is another behavior that can lead to performance bottlenecks: **unnecessary re-renders**. As I said before, rendering means that React is calling your component function or its `render` method. React renders a component to recalculate the data to reflect the changes within the component. In what circumstances will a re-render be unnecessary?

There are four reasons for React to re-render a component:

1. The **state** of the component has changed, which must be triggered with the state setting function.
2. The **props** the component receives have changed.
3. The **context** values the component uses have changed.
4. The component's **parent** has been re-rendered because of the reasons above.

Now the first three can't and also shouldn't be avoided because those are basically data changes, which must be recalculated and displayed on the screen. But the last one is, most of the time, unnecessary. When a parent component changes, if there is no change to be applied on the child, there is no need to call the component function to reflect any data changes.

<HikeWithNoPreview>

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

Here is an example:

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

When you click the [`CountButton`](focus://31:34), it changes the [state](focus://23:26) of its parent `Example`, which triggers a re-render for `Example`, which in turn leads to the unnecessary re-render of the [`NameInput`](focus://37:40) even though none of its props has changed.

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

So how do we solve this problem?

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

### Solution: `React.memo`

`React.memo(component)`: memoize a component and only re-render it when the props it receives changes.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}
NameInput = React.memo(NameInput)

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

To prevent the unnecessary re-render of `NameInput`, we can wrap it with `React.memo` as a bail-out. Like [this](focus://20):

<CodeSlot style={{zoom: 0.8}}/>

By doing this we let React know that it doesn't need a re-render until at least one of its props changes.

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}
CountButton = React.memo(CountButton)

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}
NameInput = React.memo(NameInput)

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = () => {
    setCount((c) => c + 1)
  }

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

#### `React.memo`: Might not work like a charm

You might want to ask what if we do this to the `CountButton`. Here is the answer: If we were to only wrap it into `React.memo` like [this](focus://6), _it wouldn't work_, because `increment` always gets re-initialized every time `Example` gets re-rendered, which makes the `onClick` prop of `CountButton` changes all the time due to referential inequality. But `React.memo` only prevent re-renders when all the props stay the same.

<CodeSlot style={{zoom: 0.8}}/>

<StepHead>

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}
CountButton = React.memo(CountButton)

function NameInput({name, onNameChange}) {
  return (
    <label>
      Name:{' '}
      <input
        value={name}
        onChange={(e) =>
          onNameChange(e.target.value)
        }
      />
    </label>
  )
}
NameInput = React.memo(NameInput)

function Example() {
  const [name, setName] = React.useState('')
  const [count, setCount] = React.useState(0)
  const increment = React.useCallback(
    () => setCount((c) => c + 1),
    []
  )

  return (
    <div>
      <div>
        <CountButton
          count={count}
          onClick={increment}
        />
      </div>
      <div>
        <NameInput
          name={name}
          onNameChange={setName}
        />
      </div>
      {name ? (
        <div>{`${name}'s favorite number is ${count}`}</div>
      ) : null}
    </div>
  )
}
```

</StepHead>

**Unless** we also wrap the `increment` function within the `Example` with `React.useCallback`. Like [this](focus://26:29):

Just so you know that it's better to use `React.memo` more mindfully rather than shove everything into it.

<CodeSlot style={{zoom: 0.8}}/>

</HikeWithNoPreview>

<HikeWithNoPreview>

<StepHead>

```js
function Menu({
  items,
  getMenuProps,
  getItemProps,
  highlightedIndex,
  selectedItem,
}) {
  return (
    <ul {...getMenuProps()}>
      {items.map((item, index) => (
        <ListItem
          key={item.id}
          getItemProps={getItemProps}
          item={item}
          index={index}
          selectedItem={selectedItem}
          highlightedIndex={highlightedIndex}
        >
          {item.name}
        </ListItem>
      ))}
    </ul>
  )
}
Menu = React.memo(Menu)

function ListItem({
  getItemProps,
  item,
  index,
  selectedItem,
  highlightedIndex,
  ...props
}) {
  const isSelected =
    selectedItem?.id === item.id
  const isHighlighted =
    highlightedIndex === index
  return (
    <li
      {...getItemProps({
        index,
        item,
        style: {
          fontWeight: isSelected
            ? 'bold'
            : 'normal',
          backgroundColor: isHighlighted
            ? 'lightgray'
            : 'inherit',
        },
        ...props,
      })}
    />
  )
}
ListItem = React.memo(ListItem)
```

</StepHead>

#### `React.memo`: Use a custom comparator function

Most of the time, a simple `React.memo` works just fine, there are times when its default behavior isn't what you desire.

Imagine you are rendering a menu containing a list of items, and the user can highlight a item at a time. Your `Menu` and `ListItem` components might look like [this](focus://1,27).

Both of these components are wrapped into `React.memo` [already](focus://25,57). So now you might expect this way the performance has been optimized to its highest level. But here is a problem still unsolved: when the user highlights a different item, besides the the previously and newly highlighted items, all the other untouched items will still be re-rendered. And that's because every time the user highlights a different item, they changes the `highlightedIndex` prop, which triggers the re-render of each item, no matter if it was highlighted previously or is highlighted now or never has been touched the whole time.

<StepHead>

```js
function Menu({
  items,
  getMenuProps,
  getItemProps,
  highlightedIndex,
  selectedItem,
}) {
  return (
    <ul {...getMenuProps()}>
      {items.map((item, index) => (
        <ListItem
          key={item.id}
          getItemProps={getItemProps}
          item={item}
          index={index}
          selectedItem={selectedItem}
          highlightedIndex={highlightedIndex}
        >
          {item.name}
        </ListItem>
      ))}
    </ul>
  )
}
Menu = React.memo(Menu)

function ListItem({
  getItemProps,
  item,
  index,
  selectedItem,
  highlightedIndex,
  ...props
}) {
  const isSelected =
    selectedItem?.id === item.id
  const isHighlighted =
    highlightedIndex === index
  return (
    <li
      {...getItemProps({
        index,
        item,
        style: {
          fontWeight: isSelected
            ? 'bold'
            : 'normal',
          backgroundColor: isHighlighted
            ? 'lightgray'
            : 'inherit',
        },
        ...props,
      })}
    />
  )
}
ListItem = React.memo(
  ListItem,
  (prevProps, nextProps) => {
    // true means do NOT rerender
    // false means DO rerender

    // these ones are easy if any of these changed, we should re-render
    if (
      prevProps.getItemProps !==
      nextProps.getItemProps
    )
      return false
    if (prevProps.item !== nextProps.item)
      return false
    if (prevProps.index !== nextProps.index)
      return false
    if (
      prevProps.selectedItem !==
      nextProps.selectedItem
    )
      return false

    // this is trickier. We should only re-render if this list item:
    // 1. was highlighted before and now it's not
    // 2. was not highlighted before and now it is
    if (
      prevProps.highlightedIndex !==
      nextProps.highlightedIndex
    ) {
      const wasPrevHighlighted =
        prevProps.highlightedIndex ===
        prevProps.index
      const isNowHighlighted =
        nextProps.highlightedIndex ===
        nextProps.index
      return (
        wasPrevHighlighted ===
        isNowHighlighted
      )
    }
    return true
  }
)
```

</StepHead>

To solve this problem, you'll need to change how React should compare props over time. And this is where the **custom comparator** comes into play. You can pass a custom comparator as the second argument into `React.memo` so that it uses your, hopefully better, rules, instead of its default rules, for prop comparison. For example, for the `Menu` and `ListItem`, we can do [this](focus://59:98):

This way the `ListItem` won't be re-rendered unless it is involved in highlight changes.

<StepHead>

```js
function Menu({
  items,
  getMenuProps,
  getItemProps,
  highlightedIndex,
  selectedItem,
}) {
  return (
    <ul {...getMenuProps()}>
      {items.map((item, index) => (
        <ListItem
          key={item.id}
          getItemProps={getItemProps}
          item={item}
          index={index}
          // we move the calculation details here
          isSelected={
            selectedItem?.id === item.id
          }
          isHighlighted={
            highlightedIndex === index
          }
        >
          {item.name}
        </ListItem>
      ))}
    </ul>
  )
}
Menu = React.memo(Menu)

function ListItem({
  getItemProps,
  item,
  index,
  // we only pass two boolean props here
  isHighlighted,
  isSelected,
  ...props
}) {
  return (
    <li
      {...getItemProps({
        index,
        item,
        style: {
          backgroundColor: isHighlighted
            ? 'lightgray'
            : 'inherit',
          fontWeight: isSelected
            ? 'bold'
            : 'normal',
        },
        ...props,
      })}
    />
  )
}
// and we don't need a custom comparator here
ListItem = React.memo(ListItem)
```

</StepHead>

#### `React.memo`: Parent keeps the calculation, children keep the primitive props

You might notice the logic in the custom comparator above is quite mind-boggling, especially when you are working on a big project with a team of many people. So for that scenario, one takeaway you might find valuable is that, if you're rendering a ton of instances of a particular component, try to do calculations a little higher -- maybe in the parent or even higher -- so you only need to pass primitive values to the component and let those value changes trigger DOM updates. That way you won't have to worry about breaking memoization or create a custom comparator, which can save you quite some code and brain cells. For example, we can simplify the code above like [this](focus://16:22,36:38,59:60):

<CodeSlot style={{zoom: 0.8}}/>

Notice how we move the details of the highlight and selection calculation up to the parent component `Menu`, only pass two boolean props `isHighlighted` and `isSelected` to the child component `ListItem` and don't even have to write a custom comparator function.

</HikeWithNoPreview>

## Problem: Rendering huge lists with large quantities of data

As we learned before, React is pretty optimized itself and provides a suite of performance optimization tools for you to use. But if you were to make huge updates to the DOM, there is little React can do because there is just too much to do. This problem is always revealed by UIs like data visualization, grids, tables, and lists with lots of data. There’s only so much you can do before we have to conclude that we’re simply running too much code (or running the same small amount of code too many times).

### Solution: Windowing

But it's still possible for us to work around this: when the user scroll through a huge table, chances are that they are only gonna see a portion of it, and that portion they are viewing won't be bigger than their window size. So what we can do is just to fetch a tiny part of the whole data set and render only for that portion exposed to the user, and as the user scroll through the list, we just "lazy" fetch the additional data, render the newly needed UI, and destroy the unwanted part just in time. Because the "lazy" rendered part of the UI is no bigger than the user's window size, this technique is known as "windowing", aka "virtualization". This works perfectly for this particular problem and can save you a ton of computational power.

![Windowing a list](https://user-images.githubusercontent.com/22409868/148178031-d8b785e6-e706-4f8f-9d24-2efc105e3ada.png)

![Windowing a grid (table)](https://user-images.githubusercontent.com/22409868/148177888-9e3dadde-dd42-4e15-89a4-575fcb15d536.png)

There are many libraries that allow you to use this "windowing" technique, such as [`react-window`](https://react-window.vercel.app/#/examples/list/fixed-size) and [`react-virtualized`](https://bvaughn.github.io/react-virtualized/). These two are older compared to [`react-virtual`](https://react-virtual.tanstack.com/), which can be added to your project with one simple hook and supports all kinds of customization, including vertical, horizontal, grid, fixed, variable, dynamic, smooth and even infinite virtualization. Definitely give it a try!

<HikeWithNoPreview>

<StepHead>

```js
function MyListOfData({items}) {
  return (
    <ul style={{height: 300}}>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

</StepHead>

Here is a regular data list component.

<StepHead>

```js
import {useVirtual} from 'react-virtual'

function MyListOfData({items}) {
  const listRef = React.useRef()
  const rowVirtualizer = useVirtual({
    size: items.length,
    parentRef: listRef,
    estimateSize: React.useCallback(
      () => 20,
      []
    ),
    overscan: 10,
  })

  return (
    <ul
      ref={listRef}
      style={{
        position: 'relative',
        height: 300,
      }}
    >
      <li
        style={{
          height: rowVirtualizer.totalSize,
        }}
      />
      {rowVirtualizer.virtualItems.map(
        ({index, size, start}) => {
          const item = items[index]
          return (
            <li
              key={item.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: size,
                transform: `translateY(${start}px)`,
              }}
            >
              {item.name}
            </li>
          )
        }
      )}
    </ul>
  )
}
```

</StepHead>

And here is the windowed version with `react-virtual`.

</HikeWithNoPreview>

## Problem: Global state changes trigger slow batch re-renders

Optimizing performance for a few components are relatively easy, compared to doing that for many different components when you use contexts or global state management tools, like Redux, to manage the state of your apps. This scenario doesn't give you a clear clue to fix the problem because none of the components are slow in isolation but they update slow together when there is a global state change. The root of the problem is that there are just too many components responding to the state update and many of them shouldn't even do that.

One way to work around this is to "colocate" the global state down to each component, which works but can be quite some work for you if in a big project. So how can we make every component only re-render when the state it really cares about update?

### Solution: Use Recoil

[Recoil](https://recoiljs.org/) allow you to connect to the exact piece of state, which is a huge performance benefit. Some people also suggest using [MobX](https://mobx.js.org/README.html), and as the author of MobX Michel Weststrate [tweeted](https://twitter.com/mweststrate/status/1261369870152871937), both Recoil and MobX solves the problem of efficient rendering widely shared state, the problem that "React (Context), Redux and most state management libs don't solve." But I would recommend you to use Recoil with React. Because Recoil is built on top of React primitives, which makes it lean, flexible, and integrates closely with React's concurrent mode. It also handles data in an async way in a quasi-functional manner and integrates better with React hooks. In short, _Recoil thinks the way that React does_. So going with Recoil won't be a bad decision for you if you want to manage complex state performantly with React.

## Problem: Monitoring performance in production

Things happen in production, especially for performance problems. There will be situations in which some unexpected mistake slips through the code review process and causes a performance problem. On the other hand, we can't make every user install the React devtool and profile the app for us as they use it. How are we gonna monitor things like that?

### Solution: Use the `<React.Profiler>`

The React team has created an [`<React.Profiler>`](https://reactjs.org/docs/profiler.html) API specifically for situation like this. It doesn’t give us quite as much information as the React DevTools do, but it does give us some useful information.

<HikeWithNoPreview>

<StepHead>

```js
return (
  <App>
    <Navigation {...props} />
  </App>
)
```

</StepHead>

Here is a basic example:

<StepHead>

```js
return (
  <App>
    <Profiler
      id="Navigation"
      onRender={onRenderCallback}
    >
      <Navigation {...props} />
    </Profiler>
  </App>
)
```

</StepHead>

Wrap the target component within the `Profiler` to enable this feature. It’s important to note that unless you build your app using `react-dom/profiling` and `scheduler/tracing-profiling` this component won’t do anything.

<StepHead>

```js
function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  interactions
) {
  //
}

// ...
return (
  <App>
    <Profiler
      id="Navigation"
      onRender={onRenderCallback}
    >
      <Navigation {...props} />
    </Profiler>
  </App>
)
```

</StepHead>

For the `onRender` prop, you'll need to pass a callback function with a particular [signature](focus://2:8) otherwise the profiler component won't work. The `id` prop of the Profiler tree that has just committed.
You can trace the `phase` of either "mount" (if the tree just mounted) or "update" (if it re-rendered. `actualDuration` is the time spent rendering the committed update. `baseDuration` is the estimated time to render the entire subtree without memoization. `startTime` is when React began rendering this update. `commitTime` is when React committed this update. `interactions` is the Set of interactions belonging to this update. In the callback you can do anything you want with the data, including do calculation, pass the result to your backend, aggregate or log render timings and so on.

</HikeWithNoPreview>

I might write about more things on React performance, such as devtools, React Query, browser performance profiler and so on. Stay tuned.
