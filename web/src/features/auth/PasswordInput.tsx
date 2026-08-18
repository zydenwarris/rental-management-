import { useState, type ComponentPropsWithRef } from "react";
import { cx, ui } from "@app/components/ui/index.js";
import styles from "./auth.module.css";

/**
 * A password box with a reveal toggle.
 *
 * Typing a password blind is the most common reason a correct one gets rejected, and
 * on a phone keyboard it is close to guaranteed. The toggle is a button rather than a
 * checkbox so it never enters the form's value.
 */
export function PasswordInput({
  invalid = false,
  ...props
}: ComponentPropsWithRef<"input"> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.passwordWrap}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cx(ui.input, invalid && ui.inputInvalid)}
      />
      <button
        type="button"
        className={styles.reveal}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
