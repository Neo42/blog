---
title: 'React Performance Recipes'
excerpt: 'Performance optimization can be daunting, but there are still more solutions than problems. In this post, I talked about how to tackle common performance issues when developing with React. Get a solution for every React performance problem you might encounter.'
coverImage: '/assets/blog/react-po/cover.jpg'
date: '2022-01-05'
author:
  name: Hao Jiang
  picture: '/assets/blog/authors/hao.png'
ogImage:
  url: '/assets/blog/react-po/cover.jpg'
---

## Problem: Unnecessary Callback Re-Initiation

When you're using a callback function within `useEffect`, it's hard to predict how callback function will be modified in the future. Only passing in certain variables from the callback to the deps list won't do. Because once the variables passed in gets removed, your dependencies won't work any more. But you still have to provide some values to the dependency list to sync `useEffect` with the callback change.

```js
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count)
React.useEffect(() => {
  updateLocalStorage()
}, []) // <-- what goes in that dependency list?
```

One way we can solve this is to include the entire callback function into the dependency list.

```js
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count)
React.useEffect(() => {
  updateLocalStorage()
}, [updateLocalStorage]) // <-- function as a dependency
```

But doing this also introduces another problem -- because the callback function is defined in the component's function body, it will be recreated (or "re-initialized") from scratch every time the component gets rendered, and since the function type is **compared through references**, every re-initialized callback function is different. So `useEffect` fires in every render due to the value referential inequality of the callback function in the deps list.

```js
const updateLocalStorage = () =>
  window.localStorage.setItem('count', count) // will be recreated in every render
React.useEffect(() => {
  updateLocalStorage()
}, [updateLocalStorage]) // changes in every render
```

### Solution: `React.useCallback`

`const memoizedCallback = React.useCallback(callback, dependencyList)`: **Memoizes a callback function, only re-initialized it when the dependencies change and avoids referential inequality.**

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

Notice: `useCallback` won't necessarily make a callback function better for performance. Here is why:

```js
// a callback function vs its useCallback version
const callback = () => {}
const memoizedCallback = React.useCallback(
  callback,
  [someValue]
)
```

As you can see, `useCallback` can cause more memory allocation and the memoized one won't be garbage collected after the render, which is something you should be aware of. So remember to only `useCallback` when you have to.

## Problem: Unnecessary Expensive Calculation

React comes with the concept of "rendering". When a component is being rendered by React, that means React is calling the component function (or the `render` method in the case of class components). This comes with an unfortunate limitation that calculations performed within the function (or `render`) will be performed every single render, regardless of whether the inputs for the calculations change. For example:

```js
function MyComponent({x, y}) {
  const result = expensiveCalculation(x, y) // will be called in every render
  return <div>The result is {result}.</div>
}
```

Every time the parent component of `MyComponent` is re-rendered or some state is added later and setting the state triggers re-renders, we'll be calling `expensiveCalculation` in every render of this component, which leads to performance bottlenecks.

### Solution: `React.useMemo`

`const memoizedResult = React.useMemo(calculationCallback, dependencyList)`: **Memoizes the result of the calculation and only calls the calculation when the dependencies changes.**

With `useMemo`, this is the optimized version of `MyComponent`:

```js
function MyComponent({x, y}) {
  const result = React.useMemo(
    () => expensiveCalculation(x, y),
    [x, y]
  )
  return <div>The result is {result}.</div>
}
```

And now `result` will only be calculated again when `x` or `y` changes.

#### `React.useMemo`: Integration with context

`useMemo` can also be integrated with context to prevent unwanted re-renders caused by context changes. The way that context works is that whenever the provided value changes from one render to another, it triggers a re-render of all the consuming components (which will re-render whether or not they’re memoized). For example:

```js
const CountContext = React.createContext()

function CountProvider(props) {
  const [count, setCount] = React.useState(0)
  const value = [count, setCount]
  return (
    <CountContext.Provider
      value={value}
      {...props}
    />
  )
}
```

Every time the `<CountProvider />` is re-rendered, maybe because of parent re-renders, the value is brand new, so even though the `count` value itself may stay the same, all component consumers will be re-rendered.

The quick and easy solution to this problem is to memoize the value that you provide to the context provider:

```js
const CountContext = React.createContext()

function CountProvider(props) {
  const [count, setCount] = React.useState(0)
  const value = React.useMemo(
    () => [count, setCount],
    [count]
  )
  return (
    <CountContext.Provider
      value={value}
      {...props}
    />
  )
}
```

## So when should I `useMemo` and `useCallback`?

1. Use `useCallback` when you want to avoid unnecessary re-renders caused by **referential inequality**, for example:

   - When using callbacks in `useEffect` & passing the callback into dependency lists.

   ```js
   function Foo({bar, baz}) {
     React.useEffect(() => {
       const options = {bar, baz}
       buzz(options)
     }, [bar, baz]) // we want this to re-run if bar or baz change
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
     const bar =
       React.useCallback(() => {}, [])
     const baz = React.useMemo(
       () => [1, 2, 3],
       []
     )
     return <Foo bar={bar} baz={baz} />
   }
   ```

   - When using `React.memo` to avoid unnecessary child re-renders & passing callbacks as event handlers into child components

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

2. Use `useMemo` when you want to avoid unnecessary **computationally expensive calculations**.

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

## Problem: Unnecessary Child Re-Renders

Besides function re-initiation and value recalculation, there is another behavior that can lead to performance bottlenecks: **unnecessary re-renders**. As I said before, rendering means that React is calling your component function or its `render` method. React renders a component to recalculate the data to reflect the changes within the component. In what circumstances will a re-render be unnecessary?

There are four reasons for React to re-render a component:

1. The **state** of the component has changed, which must be triggered with the state setting function.
2. The **props** the component receives have changed.
3. The **context** values the component uses have changed.
4. The component's **parent** has been re-rendered because of the reasons above.

Now the first three can't and also shouldn't be avoided because those are basically data changes, which must be recalculated and displayed on the screen. But the last one is, most of the time, unnecessary. When a parent component changes, if there is no change to be applied on the child, there is no need to call the component function to reflect any data changes. Here is an example:

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
  const increment = () =>
    setCount((c) => c + 1)
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

When you click the `CountButton`, it changes the state of its parent `Example`, which triggers a re-render for the parent, which in turn leads to the unnecessary re-render of the `NameInput` even though none of its props has changed.

So how do we solve this problem?

### Solution: `React.memo`

`React.memo(component)`: memoize a component and only re-render it when the props it receives changes.

To prevent the unnecessary re-render of `NameInput`, we can wrap it with `React.memo` as a bail-out. Like this:

```js
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
```

By doing this we let React know that it doesn't need a re-render until at least one of its props changes.

#### `React.memo`: Not everything should be memoized

You might want to ask what if we do this to the `CountButton`. Here is the answer: If we were to wrap it into `React.memo`, it wouldn't work, unless we also wrap the `increment` function within the `Example` with `React.useCallback`. Because `increment` always gets re-initialized every time `Example` gets re-rendered, which makes the `onClick` prop of `CountButton` changes all the time due to referential inequality. But `React.memo` only prevent re-renders when all the props stay the same. So to make `React.memo` work, we have to first memoize the `increment` handler in `Example`. Like this:

```js
function CountButton({count, onClick}) {
  return (
    <button onClick={onClick}>{count}</button>
  )
}
CountButton = React.memo(CountButton)

function Example() {
  // ...
  const increment = React.useCallback(
    () => setCount((c) => c + 1),
    []
  )
  // ...
}
```

Just so you know that it's better to use `React.memo` more mindfully and not to shove everything into it.

#### `React.memo`: Use a custom comparator function

Most of the time, a simple `React.memo` works just fine, there are times when its default behavior isn't what you desire.

Imagine you are rendering a menu containing a list of items, and the user can highlight a item at a time. Your `Menu` and `ListItem` components might look like this.

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

Both of these components are wrapped into `React.memo` already. So now you might expect this way the performance has been optimized to its highest level. But here is a problem still unsolved: when the user highlights a different item, besides the the previously and newly highlighted items, all the other untouched items will still be re-rendered. And that's because every time the user highlights a different item, they changes the `highlightedIndex` prop, which triggers the re-render of each item, no matter if it was highlighted previously or is highlighted now or never has been touched the whole time.

To solve this problem, you'll need to change how React should compare props over time. And this is where the **custom comparator** comes into play. You can pass a custom comparator as the second argument into `React.memo` so that it uses your, hopefully better, rules, instead of its default rules, for prop comparison. For example, for the `Menu` and `ListItem`, we can do this:

```js
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

This way the `ListItem` won't be re-rendered unless it is involved in highlight changes.

#### `React.memo`: Parent keeps the calculation, children keep the primitive props

You might notice the logic in the custom comparator above is quite mind-boggling, especially when you are working on a big project with a team of many people. So for that scenario, one takeaway you might find valuable is that, if you're rendering a ton of instances of a particular component, try to do calculations a little higher -- maybe in the parent or even higher -- so you only need to pass primitive values to the component and let those value changes trigger DOM updates. That way you won't have to worry about breaking memoization or create a custom comparator, which can save you quite some code and brain cells. For example, we can simplify the code above like this:

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

Notice how we move the details of the highlight and selection calculation up to the parent component `Menu`, only pass two boolean props `isHighlighted` and `isSelected` to the child component `ListItem` and don't even have to write a custom comparator function.

## Problem: Rendering huge lists with large quantities of data

As we learned before, React is pretty optimized itself and provides a suite of performance optimization tools for you to use. But if you were to make huge updates to the DOM, there is little React can do because there is just too much to do. This problem is always revealed by UIs like data visualization, grids, tables, and lists with lots of data. There’s only so much you can do before we have to conclude that we’re simply running too much code (or running the same small amount of code too many times).

### Solution: Windowing

But it's still possible for us to work around this: when the user scroll through a huge table, chances are that they are only gonna see a portion of it, and that portion they are viewing won't be bigger than their window size. So what we can do is just to fetch a tiny part of the whole data set and render only for that portion exposed to the user, and as the user scroll through the list, we just "lazy" fetch the additional data, render the newly needed UI, and destroy the unwanted part just in time. Because the "lazy" rendered part of the UI is no bigger than the user's window size, this technique is known as "windowing", aka "virtualization". This works perfectly for this particular problem and can save you a ton of computational power.

![Windowing a list](https://user-images.githubusercontent.com/22409868/148178031-d8b785e6-e706-4f8f-9d24-2efc105e3ada.png)

![Windowing a grid (table)](https://user-images.githubusercontent.com/22409868/148177888-9e3dadde-dd42-4e15-89a4-575fcb15d536.png)

There are many libraries that allow you to use this "windowing" technique, such as [`react-window`](https://react-window.vercel.app/#/examples/list/fixed-size) and [`react-virtualized`](https://bvaughn.github.io/react-virtualized/). These two are older compared to [`react-virtual`](https://react-virtual.tanstack.com/), which can be added to your project with one simple hook and supports all kinds of customization, including vertical, horizontal, grid, fixed, variable, dynamic, smooth and even infinite virtualization. Definitely give it a try! Here is a simple example of the usage of `react-virtual`.

```js
// before
function MyListOfData({items}) {
  return (
    <ul style={{height: 300}}>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

// after
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

## Problem: Global state changes trigger slow batch re-renders

Optimizing performance for a few components are relatively easy, compared to doing that for many different components when you use contexts or global state management tools, like Redux, to manage the state of your apps. This scenario doesn't give you a clear clue to fix the problem because none of the components are slow in isolation but they update slow together when there is a global state change. The root of the problem is that there are just too many components responding to the state update and many of them shouldn't even do that.

One way to work around this is to "colocate" the global state down to each component, which works but can be quite some work for you if in a big project. So how can we make every component only re-render when the state it really cares about update?

### Solution: Use Recoil

[Recoil](https://recoiljs.org/) allow you to connect to the exact piece of state, which is a huge performance benefit. Some people also suggest using [MobX](https://mobx.js.org/README.html), and as the author of MobX Michel Weststrate [tweeted](https://twitter.com/mweststrate/status/1261369870152871937), both Recoil and MobX solves the problem of efficient rendering widely shared state, the problem that "React (Context), Redux and most state management libs don't solve." But I would recommend you to use Recoil with React. Because Recoil is built on top of React primitives, which makes it lean, flexible, and integrates closely with React's concurrent mode. It also handles data in an async way in a quasi-functional manner and integrates better with React hooks. In short, _Recoil thinks the way that React does_. So going with Recoil won't be a bad decision for you if you want to manage complex state performantly with React.

## Problem: Monitoring performance in production

Things happen in production, especially for performance problems. There will be situations in which some unexpected mistake slips through the code review process and causes a performance problem. On the other hand, we can't make every user install the React devtool and profile the app for us as they use it. How are we gonna monitor things like that?

### Solution: Use the `<React.Profiler>`

The React team has created an [`<React.Profiler>`](https://reactjs.org/docs/profiler.html) API specifically for situation like this. It doesn’t give us quite as much information as the React DevTools do, but it does give us some useful information. Here is a basic example:

```js
<App>
  <Profiler
    id="Navigation"
    onRender={onRenderCallback}
  >
    <Navigation {...props} />
  </Profiler>
  <Main {...props} />
</App>
```

It’s important to note that unless you build your app using `react-dom/profiling` and `scheduler/tracing-profiling` this component won’t do anything.
