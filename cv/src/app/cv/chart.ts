import { Cv } from './cv';

export module Chart {
  export class ChartData {
    constructor(name: String, value: number) {
      this.name = name;
      this.value = value;
    }
    name: String;
    value: number;
  }

  export function create_language_data(cv: Cv.Cv): ChartData[] {
    let values = new Map();
    for (let project of cv.projects) {
      let end = project.endDate != null ? to_date(project.endDate) : new Date();
      let start = to_date(project.startDate);
      let to_hour_divisor = 1000 * 3600;
      let project_time_multiplier = project.time / 100;
      let duration = Math.round((end.getTime() - start.getTime()) * project_time_multiplier / to_hour_divisor);
      for (let tech of project.languages) {
        values.set(tech, (values.get(tech) || 0) + duration);
      }
    }
    let data = [];

    for (let [key, value] of values) {
      data.push(new ChartData(key, value))
    }
    data.sort((b, a) => a.value - b.value);
    return data;
  }

  function to_date(date: String): Date {
    let split = date.split("-");
    let year: number = +split[0];
    let month: number = +split[1];
    return new Date(year, month - 1);
  }


}
