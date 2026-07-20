/**
 * A text input with a dropdown of suggestions the person can also type
 * past — built on the native <datalist>, so it needs no extra
 * dependency and degrades gracefully. Unlike a <select>, whatever the
 * person types (not just what's suggested) is a valid value.
 */
export default function ComboInput({ id, value, onChange, options, placeholder, className = 'input' }) {
  const listId = `${id}-options`

  return (
    <>
      <input
        id={id}
        list={listId}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  )
}
