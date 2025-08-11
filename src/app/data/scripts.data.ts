import { IScripts } from '../interfaces/data.interface';

export const scripts: IScripts[] = [
  {
    id: 0,
    name: `Trucking 101 ~ FAQ`,
    content: `~ FAQ

#1 How much can I drive?
Every truck driver in the U.S. is allowed to drive for up to 11 hours per day, with a mandatory 30-minute break after driving for 8 consecutive hours.

#2 How long is my shift?
Your shift is 14 hours long, which includes both driving and time spent in 'On Duty' status. Once your 14 hours are up, you’ll need to take a 10-hour break before starting a new shift.

#3 What is a cycle?
A cycle refers to your total working time (both 'Driving' and 'On Duty' statuses). You are allowed to work up to 70 hours in an 8-day cycle. Once you reach 70 hours, you’ll need to take a 34-hour reset to start a new cycle.

#4 What is 'On Duty' and when do I use it?
Use 'On Duty' whenever you're performing work-related tasks other than driving. This includes pre-trip inspections, loading or unloading, fueling, mechanic visits, or time spent at weigh stations.

#5 What is 'Off Duty'?
Use 'Off Duty' when you're not doing any work-related tasks and are free to rest, eat, relax, or take personal time. This time does not count against your shift or cycle.

#6 What is 'Sleeper Berth'?
This status is used when you're resting inside your truck's sleeper area. It can be used to complete your 10-hour break or as part of a Split Sleeper break (see below). This time does not count against your shift or cycle.
`,
  },
  {
    id: 1,
    name: `Hello and welcome!`,
    content: `Hello and welcome!
We are your ELD logbook support team. Our job is to ensure your log is always in good shape and that you make your deliveries on time.

Before you start rolling, there are a few things you should know about the ProLogs app:
To maintain a smooth connection and avoid unlogged driving events, keep the ProLogs app open and your device’s screen turned on. The app uses Bluetooth to communicate with your truck’s ELD device. Because of this, we strongly advise against connecting any other Bluetooth devices to your ProLogs device, as this can cause disconnects.
Staying connected is of utmost importance. If you ever notice the app isn’t behaving as it should, for example if it asks for your location or odometer reading when setting your duty status, or if it shows “connecting” or “searching” in the top-right corner, please call us right away so we can take care of it.

Always keep your logs certified, and make sure your shipping details and trailer ID are up to date. If you’re unsure how to do any of this in the app, feel free to reach out. Our offices are open 24/7.

Remember to save this number to your contacts. We look forward to hearing from you!`,
  },

  {
    id: 2,
    name: `Hello and welcome!!`,
    content: `Hello and welcome!
We’re your ELD logbook support team, here to help keep your logs in shape and your deliveries on time.

Before you hit the road, here are a few key tips about the ProLogs app:

Keep the app open and your screen on to avoid unlogged drive time. The app uses Bluetooth to connect to your truck’s ELD, so don’t pair other Bluetooth devices to the same phone or tablet. This can cause disconnects.

If the app asks for your location, odometer reading, or shows “connecting” or “searching” in the top-right corner, something is wrong. Call us right away so we can fix it.

Always certify your logs and keep your trailer ID and shipping info updated. If you’re unsure how to do that in the app, contact us anytime. We’re here 24/7.

Save this number to your contacts. We look forward to hearing from you!`,
  },

  {
    id: 3,
    name: `Hello and welcome!!!`,
    content: `Hello and welcome aboard, we're glad to have you with us!
We’re your Logbook Support Team, and we’re here to help you with any and all ELD-related issues.

Before starting each shift, be sure to set your status to On Duty and complete a 15-minute Pre-Trip Inspection.

Whenever you're picking up, delivering freight, or fueling, remember to switch your status to On Duty.

After each pickup, please make sure to update the Shipping ID and Trailer ID fields in the app. If you’re unsure how to do this you can just send us a clear photo of the BOL (Bill of Lading) and we’ll do it for you.

Here are a few key hours-of-service guidelines to keep in mind:

Each shift is limited to 14 hours, with a maximum of 11 hours of driving.

After 8 hours of driving, you're required to take a 30-minute break (in Sleeper, Off Duty, or On Duty status).

If you are ever in need of assistance feel free to either call or text us. Our offices are open 24/7 and someone will always be available to assist you.

We look forward to working with you and helping you get to where you need to go on time and stress-free.`,
  },

  {
    id: 4,
    name: 'Your logs are locked',
    content: `Sir, you were recently stopped by the DOT, and they took a copy of your logs. When this happens, your logs are automatically locked, and we cannot edit any status from before the inspection. For example, if you were stopped today at 5 PM, anything before 5 PM cannot be changed.

This means we can’t "make" you any time right now, as we can only adjust statuses after the inspection time. Smaller edits may be possible depending on the situation, but they usually only result in a few minutes or a few hours at most, nothing major. Typically, it takes about seven days of legal driving to build enough spare time we can work with again, so please try to drive a bit less over the next week.`,
  },

  {
    id: 5,
    name: 'Your logs are locked (short)',
    content: `Sir, DOT stopped you and your logs are now locked. We can only change events after the inspection, so we can’t make you more time. Please drive legally for about a week so we can get enough time to work with again.`,
  },

  {
    id: 6,
    name: 'ELD disconnected - Bluetooth',
    content: `What to do if you cannot connect to your ELD device:
(for example, if the app says “Connecting,” “Searching,” or asks for your location/odometer)

#1 Check if Bluetooth is enabled. If it is, move on to Step 2.
#2 Try signing out of the app and signing back in. If the situation remains the same, proceed to Step 3.
#3 Sign out of the app, turn the engine off, and physically unplug the ELD device from your vehicle.
#4 Wait about 10 to 15 seconds, then turn the engine on and plug the ELD device back into the truck.
#5 Sign back into the ProLogs app. If the problem still persists, give us a call.`,
  },
  {
    id: 7,
    name: 'ELD disconnected - Bluetooth (short)',
    content: `ELD Not Connecting? Try these steps:

#1 Make sure Bluetooth is ON.
#2 Sign out of the app, then sign back in.
#3 If still not working, sign out, turn off the engine, unplug the ELD.
#4 Wait 10-15 sec, start engine, plug ELD back in.
#5 Sign in again. If it still won’t connect, call us.`,
  },
];
