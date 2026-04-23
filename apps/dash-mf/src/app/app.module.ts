import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app.component';
import { DashModule } from './dash/dash.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    DashModule,
    RouterModule.forRoot([
      { path: '', redirectTo: 'dash', pathMatch: 'full' },
      { path: '**', redirectTo: 'dash' },
    ]),
  ],
  providers: [provideHttpClient(withFetch())],
  bootstrap: [AppComponent],
})
export class AppModule {}
