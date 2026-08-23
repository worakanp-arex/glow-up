import { useReveal } from "../../hooks/useReveal.js";

function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useReveal();

  return (
    <Tag ref={ref} className={`reveal${className ? ` ${className}` : ""}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

export default Reveal;
