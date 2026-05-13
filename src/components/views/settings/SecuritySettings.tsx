import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import { selectSecurityPreferences, updateSecuritySettings } from "@/redux/preferences";

export default function SecuritySettings() {
  const dispatch = useDispatch();
  const settings = useSelector(selectSecurityPreferences);

  const toggleSetting = (key: keyof typeof settings) => {
    dispatch(updateSecuritySettings({ [key]: !settings[key] }));
  };

  return (
    <div>
      <ViewHeader title="Security" subtitle="Protect your wallet" showBack />
      <div className="flex flex-col px-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-neutral-800 dark:text-neutral-100">App Lock</p>
              <p className="text-xs text-neutral-500">Require PIN/Biometrics to open the app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.lockOnAppStart} 
                onChange={() => toggleSetting("lockOnAppStart")} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
          
          <div className="border-t border-neutral-100 dark:border-neutral-700 my-4"></div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-neutral-800 dark:text-neutral-100">Transaction Security</p>
              <p className="text-xs text-neutral-500">Always ask for PIN/Biometrics before sending</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.requireAuthForSend} 
                onChange={() => toggleSetting("requireAuthForSend")} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-700 my-4"></div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-neutral-800 dark:text-neutral-100">Use Biometrics</p>
              <p className="text-xs text-neutral-500">Use FaceID/TouchID if available</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.useBiometrics} 
                onChange={() => toggleSetting("useBiometrics")} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-warn-light/10 border border-warn-light/20">
          <p className="text-xs text-warn-dark font-medium leading-relaxed">
            Note: Disabling security features makes it easier to use the app but increases the risk if your phone is stolen or accessed by others.
          </p>
        </div>
      </div>
    </div>
  );
}
