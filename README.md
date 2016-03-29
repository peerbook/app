# Peerbook App
This is the base repository of Peerbook for the app for Android.

## Installing
This app is made using ionic framework and angularJS. You will need ionic.

`npm install`
`npm install -g ionic`
`ionic platform android`
`ionic build android`
`ionic run android` or `ionic emulate android`
It should also work on ios, but not tested.

You can also use `sass` for the stylesheet. By installing gulp and running gulp.

## Building
You can build a release version for yourself by running:

```
cordova build --release android
file=android-release-unsigned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore peerbook.keystore $file peerbook
zipalign -v 4 $file Peerbook.apk 
```

## Disclaimer
Feel free to contribute or use it yourself.
We will publish the Peerbook app on the playstore of Google. You are allowed to make your custom version, and release it.
However, the name Peerbook cannot be used. All other names and usages are allowed within the borders of the GPL License.

# Made by
Han van der Veen and Albert Wieringa
