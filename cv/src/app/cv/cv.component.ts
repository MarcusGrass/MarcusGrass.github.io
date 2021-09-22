import { Component, OnInit } from '@angular/core';
import { Cv } from './cv';
import { Chart } from './chart';
import ChartData = Chart.ChartData;

@Component({
  selector: 'app-cv',
  templateUrl: './cv.component.html',
  styleUrls: ['./cv.component.css']
})
export class CvComponent implements OnInit {
  cv: Cv.Cv;
  personalProjects: Cv.Project[];
  commercialProjects: Cv.Project[];
  language_data: ChartData[] = []


  constructor() {
    let cv = Cv.createFromJson();
    cv.education.sort((b, a) => this.to_timestamp(a.startDate) - this.to_timestamp(b.startDate));
    cv.projects.sort((b, a) => this.to_timestamp(a.startDate) - this.to_timestamp(b.startDate));
    cv.employment.sort((a, b) => {
      a.roles.sort((b, a) => this.to_timestamp(a.startDate) - this.to_timestamp(b.startDate));
      b.roles.sort((b, a) => this.to_timestamp(a.startDate) - this.to_timestamp(b.startDate));
      return this.to_timestamp(b.roles[0].startDate) - this.to_timestamp(a.roles[0].startDate);

    })
    this.cv = cv;
    this.personalProjects = this.cv.projects
      .filter(value => value.company == null);
    this.commercialProjects =  this.cv.projects
      .filter(value => value.company != null);
  }

  ngOnInit(): void {
    this.language_data = Chart.create_language_data(this.cv);
  }

  to_timestamp(date: String): number {
    let split = date.split("-");
    let year: number = +split[0];
    let month: number = +split[1];
    return new Date(year, month - 1).getTime();
  }
}
