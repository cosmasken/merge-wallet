import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isAddress } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import { selectContacts, addContact, removeContact } from "@/redux/wallet";
import Address from "@/atoms/Address";
import Button from "@/atoms/Button";
import { useTranslation } from "@/translations";

export default function AddressBook() {
  const dispatch = useDispatch();
  const contacts = useSelector(selectContacts);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation();

  const handleAdd = () => {
    if (!newName.trim()) {
      setError(t("wallet.contacts.name_required"));
      return;
    }
    if (!isAddress(newAddress)) {
      setError(t("wallet.contacts.invalid_address"));
      return;
    }
    dispatch(addContact({ name: newName, address: newAddress }));
    setNewName("");
    setNewAddress("");
    setIsAdding(false);
    setError("");
  };

  return (
    <div>
      <ViewHeader title={t("wallet.contacts.title")} subtitle={t("wallet.contacts.subtitle")} showBack />
      <div className="flex flex-col gap-4 px-4">
        {isAdding ? (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="font-bold mb-4">{t("wallet.contacts.new_contact")}</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">{t("wallet.contacts.name")}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setError(""); }}
                  placeholder={t("wallet.contacts.name_placeholder")}
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">{t("wallet.contacts.address")}</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => { setNewAddress(e.target.value); setError(""); }}
                  placeholder="0x..."
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-mono text-sm"
                />
              </div>
              {error && <p className="text-error text-xs">{error}</p>}
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 p-2 rounded-lg text-neutral-500 font-medium"
                >
                  {t("wallet.contacts.cancel")}
                </button>
                <Button onClick={handleAdd} className="flex-[2] py-2">{t("wallet.contacts.save_contact")}</Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium flex items-center justify-center gap-2 hover:border-primary/30 hover:text-primary transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("wallet.contacts.add_new")}
          </button>
        )}

        <div className="flex flex-col gap-3 mt-2">
          {contacts.length === 0 && !isAdding && (
            <div className="py-20 text-center opacity-50">
              <p className="text-sm">{t("wallet.contacts.empty")}</p>
            </div>
          )}
          {contacts.map((contact) => (
            <div 
              key={contact.address}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-neutral-800 dark:text-neutral-100">{contact.name}</span>
                <Address address={contact.address as `0x${string}`} short className="text-xs text-neutral-500 font-mono" />
              </div>
              <button 
                onClick={() => dispatch(removeContact(contact.address))}
                className="p-2 text-error-light hover:text-error-dark transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
